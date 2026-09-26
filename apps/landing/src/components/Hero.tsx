'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_SLIDES, IMG, T } from '@/lib/content';

/**
 * Hero: a badge, a heavy headline, two calls to action, and the work itself.
 *
 * The reference leads with a near-black headline and spends its colour on the
 * buttons, so the image carries the warmth rather than the type. Slides still
 * advance every seven seconds until the visitor takes control, at which point
 * they stop rather than fighting them.
 */
export default function Hero({ signInHref }: { signInHref: string }) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  function goTo(i: number) {
    paused.current = true;
    setIndex((i + HERO_SLIDES.length) % HERO_SLIDES.length);
  }

  return (
    <section style={{ background: T.canvas, padding: '72px 28px 88px' }}>
      <div
        className="split-115"
        style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gap: 56, alignItems: 'center' }}
      >
        {/* Copy */}
        <div>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: T.tint, color: T.brand,
              fontSize: 13, fontWeight: 700, borderRadius: 999, padding: '7px 14px',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.brand }} />
            Sri Lanka&rsquo;s First Photography CRM
          </span>

          <h1
            style={{
              fontSize: 'clamp(38px, 5vw, 60px)', fontWeight: 800, lineHeight: 1.08,
              letterSpacing: '-0.03em', color: T.ink, margin: '22px 0 0',
            }}
          >
            Run your whole studio
            <br />
            from one place
          </h1>

          <p
            style={{
              fontSize: 17, lineHeight: 1.7, color: T.mid, margin: '20px 0 0', maxWidth: 520,
            }}
          >
            Bookings, agreements, proofing galleries, flip-through albums, payments and the crew
            calendar — together, so nothing lives in a WhatsApp thread or a spreadsheet.
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 30 }}>
            <a
              href="/get-started"
              style={{
                background: T.gradient, color: T.white,
                fontSize: 15, fontWeight: 600, borderRadius: 10, padding: '14px 26px',
                boxShadow: '0 1px 2px rgba(233,30,120,0.24)',
              }}
            >
              Start free
            </a>
            <a
              href={signInHref}
              style={{
                background: T.white, color: T.body, border: `1px solid ${T.line}`,
                fontSize: 15, fontWeight: 600, borderRadius: 10, padding: '14px 26px',
              }}
            >
              See pricing
            </a>
          </div>

          <p style={{ fontSize: 13.5, color: T.muted, marginTop: 16 }}>
            Free while you set up · No card required
          </p>
        </div>

        {/* The work */}
        <div
          style={{
            position: 'relative', borderRadius: 16, overflow: 'hidden',
            aspectRatio: '4 / 3', border: `1px solid ${T.line}`,
            boxShadow: '0 6px 20px rgba(17,24,39,0.07)',
          }}
        >
          {HERO_SLIDES.map((s, i) => (
            <div
              key={s.key}
              aria-hidden={i !== index}
              style={{
                position: 'absolute', inset: 0,
                backgroundImage: `url(${s.url ?? IMG(s.image!, 1400)})`,
                backgroundSize: 'cover',
                backgroundPosition: s.pos,
                opacity: i === index ? 1 : 0,
                transition: 'opacity 900ms ease',
              }}
            />
          ))}

          {/* Slide picker */}
          <div
            style={{
              position: 'absolute', left: 16, bottom: 16,
              display: 'flex', gap: 7,
            }}
          >
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === index}
                style={{
                  width: i === index ? 22 : 8, height: 8, borderRadius: 999, border: 0,
                  background: i === index ? T.white : 'rgba(255,255,255,0.55)',
                  cursor: 'pointer', padding: 0, transition: 'width 250ms ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
