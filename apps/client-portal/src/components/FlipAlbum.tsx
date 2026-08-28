import { useCallback, useEffect, useRef, useState } from 'react';
import { PageFlip } from 'page-flip/dist/js/page-flip.module.js';

const SERIF = "'Cormorant Garamond',Georgia,serif";
const PAGE_RATIO = 520 / 640;

export type AlbumPage =
  | { kind: 'cover'; kicker: string; title: string; body: string }
  | { kind: 'photo'; url: string; caption: string | null };

/**
 * Page-turning album built on StPageFlip, with generated ambient audio.
 *
 * Pages are built as raw DOM (not React) because StPageFlip takes ownership of
 * the elements it is given and mutates them directly — rendering them through
 * React would fight over the same nodes.
 */
export default function FlipAlbum({
  pages, title, onClose, musicEnabled = true, musicUrl = null,
  autoplay = false, autoplaySeconds = 6,
}: {
  pages: AlbumPage[];
  title: string;
  onClose?: () => void;
  /** Studios can turn the soundtrack off for an album. */
  musicEnabled?: boolean;
  /** Uploaded track. When absent, the built-in generated loop is used. */
  musicUrl?: string | null;
  /** Start turning pages on its own. */
  autoplay?: boolean;
  autoplaySeconds?: number;
}) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const readyAtRef = useRef(0);
  const pageRef = useRef(0);

  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(pages.length);
  /** Measured book area. Changing it rebuilds the book at the new size. */
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [audioOn, setAudioOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [playing, setPlaying] = useState(autoplay);

  // ── Audio: a slow four-chord loop synthesised in the browser ──────────────
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const audioTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const elementRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = useCallback(() => {
    // Uploaded track
    const el = elementRef.current;
    if (el) {
      const fade = setInterval(() => {
        el.volume = Math.max(0, el.volume - 0.08);
        if (el.volume <= 0.02) { clearInterval(fade); el.pause(); }
      }, 60);
    }

    if (audioTimerRef.current) clearInterval(audioTimerRef.current);
    audioTimerRef.current = null;

    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (master && ctx) {
      try {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      } catch { /* context already closing */ }
    }
    ctxRef.current = null;
    masterRef.current = null;
    if (ctx) setTimeout(() => ctx.close(), 900);
  }, []);

  const startAudio = useCallback(() => {
    // An uploaded track replaces the generated loop entirely.
    if (musicUrl) {
      const el = elementRef.current;
      if (!el) return;
      el.loop = true;
      el.volume = 0;
      el.play().then(() => {
        // Ease in so it doesn't jump out at the reader.
        const fade = setInterval(() => {
          el.volume = Math.min(0.5, el.volume + 0.04);
          if (el.volume >= 0.5) clearInterval(fade);
        }, 90);
      }).catch(() => { /* blocked by the browser; the toggle simply stays off */ });
      return;
    }

    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!AC) return;

    const ctx: AudioContext = new AC();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2);
    masterRef.current = master;

    const chords = [
      [261.63, 329.63, 392.00, 493.88],
      [220.00, 277.18, 329.63, 440.00],
      [174.61, 261.63, 349.23, 440.00],
      [196.00, 246.94, 392.00, 493.88],
    ];

    let step = 0;
    const playChord = () => {
      if (!ctxRef.current) return;
      const notes = chords[step % chords.length];
      step += 1;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        const t0 = ctx.currentTime + i * 0.35;
        gain.gain.setValueAtTime(0, t0);
        gain.gain.linearRampToValueAtTime(0.22 / (i + 1.2), t0 + 0.9);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 5.2);
        osc.connect(gain);
        gain.connect(master);
        osc.start(t0);
        osc.stop(t0 + 5.4);
      });
    };

    playChord();
    audioTimerRef.current = setInterval(playChord, 5200);
  }, [musicUrl]);

  function toggleAudio() {
    const next = !audioOn;
    setAudioOn(next);
    if (next) startAudio(); else stopAudio();
  }

  // ── Measure the available book area ──────────────────────────────────────
  // StPageFlip fixes page dimensions at construction, so the book has to be
  // rebuilt whenever the area changes materially (resize, fullscreen, rotate).
  useEffect(() => {
    const el = bookRef.current;
    if (!el) return;

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const node = bookRef.current;
        if (!node) return;
        const w = Math.floor(node.clientWidth || window.innerWidth - 160);
        const h = Math.floor(node.clientHeight || window.innerHeight - 190);
        if (w < 200 || h < 200) return; // layout not settled yet
        setBox((prev) => (
          prev && Math.abs(prev.w - w) < 24 && Math.abs(prev.h - h) < 24 ? prev : { w, h }
        ));
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    document.addEventListener('fullscreenchange', measure);

    // The first layout pass can land after mount; retry briefly.
    const retries = [60, 160, 320, 600].map((ms) => setTimeout(measure, ms));

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', measure);
      document.removeEventListener('fullscreenchange', measure);
      retries.forEach(clearTimeout);
    };
  }, []);

  // ── Build the book ───────────────────────────────────────────────────────
  useEffect(() => {
    const host = bookRef.current;
    if (!host || pages.length === 0 || !box) return;

    let cancelled = false;

    const build = () => {
      const el = bookRef.current;
      if (cancelled || !el) return;

      // Rebuilding at a new size — clear whatever the previous build left.
      if (flipRef.current) {
        try { flipRef.current.destroy(); } catch { /* already gone */ }
        flipRef.current = null;
      }
      el.innerHTML = '';

      const availH = Math.max(260, box.h);
      const availW = Math.max(260, box.w);

      const mount = document.createElement('div');
      mount.style.cssText = 'width:100%;display:flex;align-items:center;justify-content:center';
      el.appendChild(mount);

      const holder = document.createElement('div');
      holder.style.cssText =
        `position:absolute;left:-99999px;top:0;width:${Math.max(300, availW)}px;height:${Math.max(300, availH)}px`;

      pages.forEach((p, i) => {
        const pageEl = document.createElement('div');
        pageEl.className = 'album-page';
        if (p.kind === 'cover') pageEl.setAttribute('data-density', 'hard');
        pageEl.innerHTML = pageHtml(p, i);
        holder.appendChild(pageEl);
      });
      mount.appendChild(holder);

      // Fill the area: start from full height, then shrink only if the spread
      // would be wider than the space available (two pages up, one on narrow).
      const spreadPages = availW > 760 ? 2 : 1;
      let pageH = availH;
      let pageW = Math.round(pageH * PAGE_RATIO);
      const maxPageW = Math.floor(availW / spreadPages);
      if (pageW > maxPageW) {
        pageW = maxPageW;
        pageH = Math.round(pageW / PAGE_RATIO);
      }

      const flip = new PageFlip(mount, {
        width: pageW,
        height: pageH,
        size: 'fixed' as any,
        showCover: true,
        maxShadowOpacity: 0.5,
        drawShadow: true,
        flippingTime: 800,
        usePortrait: true,
        mobileScrollSupport: false,
        swipeDistance: 20,
        clickEventForward: false,
      } as any);

      flip.loadFromHTML(holder.querySelectorAll('.album-page'));
      flip.on('flip', (e: { data: unknown }) => setPage(Number(e.data)));

      flipRef.current = flip;
      readyAtRef.current = Date.now();
      setPageCount(flip.getPageCount());

      // Keep the reader's place across a rebuild (resize / fullscreen).
      const restoreTo = pageRef.current;
      if (restoreTo > 0) {
        try { flip.turnToPage(Math.min(restoreTo, flip.getPageCount() - 1)); } catch { /* ignore */ }
      }
      setPage(flip.getCurrentPageIndex?.() ?? 0);

      // Some browsers skip the first paint pass; nudge it once if nothing painted.
      setTimeout(() => {
        if (!flipRef.current || !bookRef.current) return;
        const painted = Array.from(bookRef.current.querySelectorAll('.stf__item')).some(
          (node) => getComputedStyle(node).display !== 'none' && node.getBoundingClientRect().height > 0,
        );
        if (!painted) {
          try { flipRef.current.update(); flipRef.current.turnToPage(0); } catch { /* ignore */ }
        }
      }, 220);
    };

    build();

    return () => {
      cancelled = true;
      if (flipRef.current) {
        try { flipRef.current.destroy(); } catch { /* already gone */ }
        flipRef.current = null;
      }
      if (host) host.innerHTML = '';
    };
  }, [pages, box]);

  // Preload page images so turns don't reveal a blank sheet.
  useEffect(() => {
    pages.forEach((p) => {
      if (p.kind === 'photo') { const img = new Image(); img.src = p.url; }
    });
  }, [pages]);

  // ── Keyboard + fullscreen ────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') flipRef.current?.flipNext();
      if (e.key === 'ArrowLeft') flipRef.current?.flipPrev();
      if (e.key === 'Escape') {
        if (immersive) setImmersive(false);
        else if (!document.fullscreenElement) onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [immersive, onClose]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Autoplay: turn a page every few seconds, and stop at the end rather than
  // looping back to the cover.
  useEffect(() => {
    if (!playing || !flipRef.current) return;

    const id = setInterval(() => {
      const flip = flipRef.current;
      if (!flip) return;
      const current = flip.getCurrentPageIndex?.() ?? 0;
      if (current >= flip.getPageCount() - 1) {
        setPlaying(false);
        return;
      }
      flip.flipNext();
    }, Math.max(2, autoplaySeconds) * 1000);

    return () => clearInterval(id);
  }, [playing, autoplaySeconds, box]);

  // Turning a page by hand takes over from autoplay.
  function manualTurn(fn: 'flipNext' | 'flipPrev') {
    setPlaying(false);
    flipRef.current?.[fn]();
  }

  // Remember the page so a rebuild can restore it.
  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => stopAudio, [stopAudio]);

  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (immersive) { setImmersive(false); return; }

    const stage = stageRef.current;
    if (!document.fullscreenEnabled || !stage?.requestFullscreen) {
      setImmersive(true); return;
    }
    try {
      stage.requestFullscreen()?.catch(() => setImmersive(true));
    } catch {
      setImmersive(true);
    }
  }

  // ── Spread dots: page 0 is the cover, then pairs ─────────────────────────
  const total = pageCount || pages.length;
  const starts = [0];
  for (let i = 1; i < total; i += 2) starts.push(i);
  let activeSpread = 0;
  starts.forEach((start, i) => { if (page >= start) activeSpread = i; });

  return (
    <div ref={stageRef} style={stageStyle(immersive, !!onClose)}>
      {musicUrl && <audio ref={elementRef} src={musicUrl} preload="none" loop />}

      {/* Header */}
      <div style={headerRow}>
        <div>
          <div style={kicker}>Digital Album</div>
          <div style={{ fontFamily: SERIF, fontSize: 26, color: '#ffffff', marginTop: 4 }}>{title}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setPlaying((p) => !p)} style={ghostPill} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}>
            {playing ? '❙❙ Pause' : '▶ Play'}
          </button>

          {musicEnabled && (
            <button onClick={toggleAudio} style={audioBtn(audioOn)}>
              {audioOn && (
                <span style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
                  <span style={eqBar(0)} /><span style={eqBar(0.2)} /><span style={eqBar(0.4)} />
                </span>
              )}
              <span>{audioOn ? 'Music on' : 'Play music'}</span>
            </button>
          )}
          <button onClick={toggleFullscreen} style={ghostPill}>
            {fullscreen || immersive ? 'Exit full screen' : 'Full screen'}
          </button>
          {onClose && (
            <button onClick={onClose} title="Close album" style={closeBtn}>✕</button>
          )}
        </div>
      </div>

      {/* Book */}
      <div style={bookRow}>
        <button onClick={() => manualTurn('flipPrev')} style={arrowBtn(page > 0)}>‹</button>
        <div ref={bookRef} style={bookHost} />
        <button onClick={() => manualTurn('flipNext')} style={arrowBtn(page < total - 1)}>›</button>
      </div>

      {/* Footer */}
      <div style={footerCol}>
        <span style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.65)', letterSpacing: 1 }}>
          Page {page + 1} of {total}
        </span>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
          {starts.map((start, i) => (
            <button
              key={start}
              onClick={() => { setPlaying(false); try { flipRef.current?.turnToPage(start); } catch { /* ignore */ } }}
              style={dotStyle(i === activeSpread)}
              aria-label={`Go to page ${start + 1}`}
            />
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', letterSpacing: 0.5 }}>
          Drag a page corner to turn it, or use the arrows and ← → keys
        </div>
      </div>
    </div>
  );
}

// ─── Page markup (raw HTML, owned by StPageFlip) ─────────────────────────────

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));
}

function pageHtml(p: AlbumPage, index: number): string {
  if (p.kind === 'cover') {
    return '<div class="page-inner" style="background:#FBFAF7;display:flex;flex-direction:column;align-items:center;'
      + 'justify-content:center;text-align:center;padding:12%;box-sizing:border-box">'
      + `<div style="font-family:${SERIF};font-size:14px;letter-spacing:5px;text-transform:uppercase;color:#8BC53F">${escapeHtml(p.kicker)}</div>`
      + `<div style="font-family:${SERIF};font-size:34px;color:#123528;margin-top:14px;line-height:1.25">${escapeHtml(p.title)}</div>`
      + '<div style="width:46px;height:1px;background:#C8D6BC;margin:18px 0"></div>'
      + `<div style="font-size:12.5px;color:#5b6660;line-height:1.7;max-width:280px">${escapeHtml(p.body)}</div>`
      + '</div>';
  }

  const caption = p.caption
    ? '<div style="position:absolute;left:0;right:0;bottom:0;padding:16px 20px;'
      + 'background:linear-gradient(transparent,rgba(9,32,24,0.78));color:#ffffff;'
      + `font-family:${SERIF};font-size:15px;letter-spacing:0.5px">${escapeHtml(p.caption)}</div>`
    : '';

  return `<div class="page-inner" style="background-image:url(${encodeURI(p.url)});background-size:cover;background-position:center">`
    + caption
    + '<div style="position:absolute;top:14px;right:18px;font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,0.7)">'
    + String(index).padStart(2, '0')
    + '</div></div>';
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function stageStyle(immersive: boolean, hasClose: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif",
    background: 'radial-gradient(circle at 50% 0%,#17513C,#0B2A20 70%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: '12px 16px 10px', boxSizing: 'border-box', overflow: 'hidden',
  };
  if (immersive) return { ...base, position: 'fixed', inset: 0, zIndex: 9999, height: '100vh', width: '100vw' };
  if (hasClose) return { ...base, position: 'fixed', inset: 0, zIndex: 90 };
  return { ...base, height: '100vh', maxHeight: '100vh' };
}

const headerRow: React.CSSProperties = {
  width: '100%', maxWidth: 1600, display: 'flex', alignItems: 'center',
  justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', flexShrink: 0,
};

const kicker: React.CSSProperties = {
  fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: '#8BC53F', fontWeight: 700,
};

const bookRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, width: '100%', maxWidth: 1600,
  justifyContent: 'center', flex: '1 1 auto', minHeight: 0,
};

const bookHost: React.CSSProperties = {
  flex: '1 1 auto', minWidth: 0, height: '100%', overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const footerCol: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7,
  width: '100%', maxWidth: 1600, flexShrink: 0,
};

function arrowBtn(enabled: boolean): React.CSSProperties {
  return {
    width: 46, height: 46, borderRadius: '50%', flexShrink: 0, fontSize: 24, lineHeight: 1,
    cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: `rgba(255,255,255,${enabled ? 0.14 : 0.05})`,
    color: `rgba(255,255,255,${enabled ? 0.92 : 0.28})`,
    border: `1px solid rgba(255,255,255,${enabled ? 0.24 : 0.1})`,
  };
}

function audioBtn(on: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, borderRadius: 22, padding: '9px 18px',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    ...(on
      ? { background: '#8BC53F', color: '#0F3D2E', border: 'none' }
      : { background: 'rgba(255,255,255,0.12)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.22)' }),
  };
}

function eqBar(delay: number): React.CSSProperties {
  return {
    width: 2, height: '100%', background: '#0F3D2E',
    animation: `eqBar 0.9s ease-in-out ${delay}s infinite`,
  };
}

const ghostPill: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.22)',
  borderRadius: 22, padding: '9px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const closeBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', color: '#ffffff',
  border: '1px solid rgba(255,255,255,0.22)', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

function dotStyle(active: boolean): React.CSSProperties {
  return {
    width: active ? 22 : 8, height: 8, borderRadius: 6, border: 'none', cursor: 'pointer', padding: 0,
    transition: 'width 0.3s ease, background 0.3s ease',
    background: active ? '#8BC53F' : 'rgba(255,255,255,0.28)',
  };
}
