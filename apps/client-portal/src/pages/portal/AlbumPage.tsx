import { useEffect, useMemo, useState } from 'react';
import { C, solidBtn, ghostBtn, label } from '../../lib/theme';
import { shortDate } from '../../lib/format';
import {
  usePortal, photoUrl, albumPhotos, albumPageUrl, albumShareUrl, albumFileUrl, eventDate,
} from '../../lib/portal';
import { Screen, Card, CardTitle, Empty, Toast } from '../../components/ui';
import FlipAlbum, { type AlbumPage as FlipPage } from '../../components/FlipAlbum';

export default function AlbumPage() {
  const { job } = usePortal();
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState('');

  const album = job.album;
  // A studio-built album wins; otherwise fall back to the client's proofing picks.
  const photos = useMemo(() => (album ? [] : albumPhotos(job)), [album, job]);
  const flipbook = job.flipbook;
  const shareUrl = flipbook ? albumShareUrl(flipbook) : null;
  const pdfUrl = flipbook ? albumFileUrl(flipbook) : null;

  const evDate = eventDate(job.shoots);
  const studio = job.studio?.name ?? 'your studio';
  const venue = job.shoots.find((s) => s.venue)?.venue;

  const defaultKicker = [venue, evDate ? shortDate(evDate) : null].filter(Boolean).join(' · ')
    || (job.event_type ?? 'Album');
  const photographer = job.shoots.flatMap((s) => s.crew)[0];

  // Cover, the pages, then a closing page — as the album design lays out.
  const pages = useMemo<FlipPage[]>(() => {
    // Studio-built album: use its configured text and ordered pages.
    if (album) {
      const built = album.pages
        .map((p) => ({ url: albumPageUrl(p), caption: p.caption }))
        .filter((p): p is { url: string; caption: string | null } => !!p.url);
      if (built.length === 0) return [];

      return [
        {
          kind: 'cover',
          kicker: album.cover_kicker || defaultKicker,
          title: album.cover_title || album.title || job.title,
          body: album.cover_body || `A ${(job.event_type ?? 'photo').toLowerCase()} album by ${studio}`,
        },
        ...built.map((p) => ({ kind: 'photo' as const, url: p.url, caption: p.caption })),
        {
          kind: 'cover',
          kicker: album.closing_kicker || 'Thank you',
          title: album.closing_title || `With love,\n${studio}`,
          body: album.closing_body
            || (photographer ? `Photographed by ${photographer}` : 'Thank you for letting us tell your story.'),
        },
      ];
    }

    if (photos.length === 0) return [];
    return [
      {
        kind: 'cover',
        kicker: defaultKicker,
        title: job.title,
        body: `A ${(job.event_type ?? 'photo').toLowerCase()} album by ${studio}`,
      },
      ...photos.map((p) => ({
        kind: 'photo' as const,
        url: photoUrl(p.storage_path),
        caption: p.caption,
      })),
      {
        kind: 'cover',
        kicker: 'Thank you',
        title: `With love,\n${studio}`,
        body: photographer ? `Photographed by ${photographer}` : 'Thank you for letting us tell your story.',
      },
    ];
  }, [album, photos, job.title, job.event_type, studio, defaultKicker, photographer]);

  const coverImage = album
    ? album.pages.map(albumPageUrl).find((u): u is string => !!u) ?? null
    : photos[0] ? photoUrl(photos[0].storage_path) : null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Body scroll would fight the fullscreen stage.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (open) {
    return (
      <FlipAlbum
        pages={pages}
        title={album?.title || job.title}
        musicEnabled={album ? album.music_enabled : true}
        musicUrl={album?.music_url ?? null}
        autoplay={album?.autoplay ?? false}
        autoplaySeconds={album?.autoplay_seconds ?? 6}
        onClose={() => setOpen(false)}
      />
    );
  }

  async function copyLink() {
    if (!pdfUrl) return;
    try {
      await navigator.clipboard.writeText(pdfUrl);
      setToast('Album link copied — share it with family and friends.');
    } catch {
      setToast('Could not copy automatically. Select the link below and copy it.');
    }
  }

  const hasFlipAlbum = pages.length > 0;

  return (
    <Screen>
      {hasFlipAlbum ? (
        <>
          {/* Cover preview → opens the flipbook */}
          <div style={hero} onClick={() => setOpen(true)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') setOpen(true); }}>
            <div style={{ position: 'absolute', inset: 0 }}>
              {coverImage && (
                <img src={coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={heroScrim} />
            </div>
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: C.lime, fontWeight: 700 }}>
                Digital Album
              </div>
              <div style={{ fontFamily: SERIF, fontSize: 34, color: '#fff', marginTop: 10 }}>
                {album?.cover_title || album?.title || job.title}
              </div>
              <div style={{ width: 46, height: 1, background: 'rgba(255,255,255,0.4)', margin: '18px auto' }} />
              <div style={{ fontSize: 13, color: '#cfe4d8' }}>
                {pages.length} page{pages.length === 1 ? '' : 's'}
                {evDate ? ` · ${shortDate(evDate)}` : ''}
              </div>
              <button onClick={(e) => { e.stopPropagation(); setOpen(true); }} style={openBtn}>
                Open album
              </button>
            </div>
          </div>

          {album?.is_public && album.share_token && (
            <Card style={{ marginTop: 16 }}>
              <CardTitle>Share your album</CardTitle>
              <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6 }}>
                Anyone with this link can watch your album — no account needed. Send it to family and
                friends.
              </p>
              <div style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                background: C.panel, border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: '12px 14px',
              }}>
                <input
                  readOnly
                  value={`${window.location.origin}/album/${album.share_token}`}
                  onFocus={(e) => e.currentTarget.select()}
                  style={{
                    flex: '1 1 220px', minWidth: 0, border: 'none', background: 'transparent',
                    fontFamily: 'inherit', fontSize: 12.5, color: C.textStrong, outline: 'none',
                  }}
                />
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/album/${album.share_token}`);
                      setToast('Album link copied — share it with anyone.');
                    } catch {
                      setToast('Select the link and copy it.');
                    }
                  }}
                  style={{ ...ghostBtn, padding: '9px 16px' }}
                >
                  Copy link
                </button>
              </div>
            </Card>
          )}

          <Card style={{ marginTop: 16 }}>
            <CardTitle>About your album</CardTitle>
            <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6 }}>
              Drag a page corner to turn it, or use the arrows and ← → keys. Tap <strong>Play music</strong> for a
              soundtrack, and <strong>Full screen</strong> to fill your display.
            </p>
          </Card>
        </>
      ) : (
        <Empty>
          Your album is being put together. Once your studio finalises the photo selection,
          you’ll be able to flip through it here.
        </Empty>
      )}

      {/* The printable PDF, when the studio has published one */}
      {flipbook?.published_at && pdfUrl && (
        <Card style={{ marginTop: 16, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={bookIcon}>📖</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>Printed album file</div>
            <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 4 }}>
              Published {shortDate(flipbook.published_at)} by {studio} · shareable, no login needed
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtn, padding: '11px 20px', display: 'inline-block' }}>
              Open PDF
            </a>
            <a href={pdfUrl} download style={{ ...ghostBtn, padding: '11px 20px', display: 'inline-block' }}>Download</a>
            <button onClick={copyLink} style={{ ...ghostBtn, padding: '11px 20px' }}>Copy share link</button>
          </div>
          {shareUrl && (
            <div style={{ width: '100%' }}>
              <div style={linkRow}>
                <span style={label}>Public link</span>
                <input readOnly value={pdfUrl} onFocus={(e) => e.currentTarget.select()} style={linkInput} />
              </div>
            </div>
          )}
        </Card>
      )}

      {toast && <Toast message={toast} />}
    </Screen>
  );
}

const SERIF = "'Cormorant Garamond',Georgia,serif";

const hero: React.CSSProperties = {
  position: 'relative', borderRadius: 20, overflow: 'hidden', color: C.white, padding: 44,
  minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
};

const heroScrim: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(180deg,rgba(15,61,46,0.55),rgba(11,42,32,0.92))',
};

const openBtn: React.CSSProperties = {
  marginTop: 22, background: C.lime, color: C.green, border: 'none', borderRadius: 22,
  padding: '12px 28px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};

const bookIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, background: C.limeSoft, border: `1px solid ${C.limeSoftBorder}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
};

const linkRow: React.CSSProperties = {
  marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, background: C.panel,
  border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: '12px 14px',
};

const linkInput: React.CSSProperties = {
  flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontFamily: 'inherit',
  fontSize: 12.5, color: C.textStrong, padding: 0, outline: 'none',
};
