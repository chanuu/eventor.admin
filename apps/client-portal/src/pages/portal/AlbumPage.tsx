import { useEffect, useState } from 'react';
import { C, solidBtn, ghostBtn, label } from '../../lib/theme';
import { shortDate } from '../../lib/format';
import { usePortal, albumShareUrl, albumFileUrl } from '../../lib/portal';
import { Screen, Card, CardTitle, Empty, Toast } from '../../components/ui';

/**
 * Digital album — the PDF the studio uploads and publishes against this job.
 * It is embedded from the studio's public share page, which signs the storage
 * URL server-side, so the portal never needs storage credentials of its own.
 */
export default function AlbumPage() {
  const { job } = usePortal();
  const flipbook = job.flipbook;
  const shareUrl = flipbook ? albumShareUrl(flipbook) : null;
  const fileUrl = flipbook ? albumFileUrl(flipbook) : null;

  const [toast, setToast] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  if (!flipbook || !flipbook.storage_path) {
    return (
      <Screen>
        <Empty>
          Your digital album hasn’t been created yet. Once your studio designs and uploads it,
          you’ll be able to flip through it here.
        </Empty>
      </Screen>
    );
  }

  if (!flipbook.published_at || !fileUrl) {
    return (
      <Screen>
        <Card style={{ padding: 26, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={bookIcon}>📖</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>Album in progress</div>
            <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 4 }}>
              Your studio is still working on the layout. It will appear here the moment they publish it.
            </div>
          </div>
          <span style={pendingPill}>Not published</span>
        </Card>
      </Screen>
    );
  }

  // The direct S3 URL is permanent and needs no login, so it is what we hand out
  // for sharing. The studio's share page stays available as a branded alternative.
  const publicUrl = fileUrl;

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setToast('Album link copied — share it with family and friends.');
    } catch {
      setToast('Could not copy automatically. Select the link below and copy it.');
    }
  }

  return (
    <Screen>
      <Card style={{ padding: 26, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={bookIcon}>📖</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>Your digital album</div>
          <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 4 }}>
            Published {shortDate(flipbook.published_at)} by {job.studio?.name ?? 'your studio'} · shareable private link
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
          <button onClick={() => setFullscreen(true)} style={{ ...solidBtn, padding: '11px 20px' }}>
            Full screen
          </button>
          <a href={fileUrl} target="_blank" rel="noreferrer" style={{ ...ghostBtn, padding: '11px 20px', display: 'inline-block' }}>
            Open in new tab
          </a>
          <a href={fileUrl} download style={{ ...ghostBtn, padding: '11px 20px', display: 'inline-block' }}>
            Download PDF
          </a>
          <button onClick={copyLink} style={{ ...ghostBtn, padding: '11px 20px' }}>Copy share link</button>
        </div>
      </Card>

      <Card style={{ padding: 0, marginTop: 16, overflow: 'hidden' }}>
        <iframe src={fileUrl} title="Digital album" style={viewer} />
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>Sharing this album</CardTitle>
        <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6 }}>
          Anyone with this link can open your album — no login, no expiry, nothing to install.
          Send it to family and friends as it is.
        </p>
        <div style={linkRow}>
          <span style={label}>Public link</span>
          <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} style={linkInput} />
        </div>
        {shareUrl && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
            Prefer a page with your studio’s branding?{' '}
            <a href={shareUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 700 }}>Use this link instead</a>.
          </p>
        )}
      </Card>

      {fullscreen && (
        <div style={fullWrap}>
          <div style={fullBar}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{job.title} — digital album</span>
            <button onClick={() => setFullscreen(false)} style={closeBtn}>Close ✕</button>
          </div>
          <iframe src={fileUrl} title="Digital album" style={{ flex: 1, border: 'none', width: '100%' }} />
        </div>
      )}

      {toast && <Toast message={toast} />}
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const bookIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, background: C.limeSoft, border: `1px solid ${C.limeSoftBorder}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
};

const pendingPill: React.CSSProperties = {
  background: C.amberSoft, color: C.amberText, fontSize: 10.5, fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: 0.5, borderRadius: 20, padding: '3px 9px', flexShrink: 0,
};

const viewer: React.CSSProperties = {
  width: '100%', height: 640, border: 'none', display: 'block', background: C.panel,
};

const linkRow: React.CSSProperties = {
  marginTop: 14, display: 'flex', alignItems: 'center', gap: 12, background: C.panel,
  border: `1px solid ${C.borderSoft}`, borderRadius: 12, padding: '12px 14px',
};

const linkInput: React.CSSProperties = {
  flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontFamily: 'inherit',
  fontSize: 12.5, color: C.textStrong, padding: 0, outline: 'none',
};

const fullWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 90, background: C.green, display: 'flex', flexDirection: 'column',
};

const fullBar: React.CSSProperties = {
  height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 18px', color: C.white, borderBottom: '1px solid rgba(255,255,255,0.14)',
};

const closeBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.12)', color: C.white, border: 'none', borderRadius: 8,
  padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
