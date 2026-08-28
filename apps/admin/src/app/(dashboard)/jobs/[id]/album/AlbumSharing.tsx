'use client';

import { useState } from 'react';
import { setAlbumSharing, setAlbumPlayback } from './actions';

export default function AlbumSharing({
  albumId, jobId, studioId, isPublic, shareToken, published, autoplay, autoplaySeconds, portalUrl,
}: {
  albumId: string;
  jobId: string;
  studioId: string;
  isPublic: boolean;
  shareToken: string;
  published: boolean;
  autoplay: boolean;
  autoplaySeconds: number;
  portalUrl: string;
}) {
  const [shared, setShared] = useState(isPublic);
  const [play, setPlay] = useState(autoplay);
  const [seconds, setSeconds] = useState(autoplaySeconds);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const link = `${portalUrl.replace(/\/$/, '')}/album/${shareToken}`;

  async function toggleShare(next: boolean) {
    setShared(next);
    setError(''); setNote('');
    const r = await setAlbumSharing(albumId, jobId, studioId, next);
    if (r?.error) { setShared(!next); setError(r.error); return; }
    setNote(next ? 'Public link is live.' : 'Public link switched off.');
  }

  async function savePlayback(nextPlay: boolean, nextSeconds: number) {
    setPlay(nextPlay); setSeconds(nextSeconds);
    setError(''); setNote('');
    const r = await setAlbumPlayback(albumId, jobId, studioId, nextPlay, nextSeconds);
    if (r?.error) { setError(r.error); return; }
    setNote('Playback settings saved.');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setNote('Link copied.');
    } catch {
      setError('Could not copy automatically — select the link and copy it.');
    }
  }

  return (
    <div style={card}>
      <h2 style={heading}>Sharing &amp; playback</h2>

      {/* Public link */}
      <label style={row}>
        <input
          type="checkbox"
          checked={shared}
          disabled={!published}
          onChange={(e) => toggleShare(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: '#8BC53F' }}
        />
        <span>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#123528' }}>
            Allow public viewing
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: '#8b968f', marginTop: 2 }}>
            The client can share a link with family and friends. No sign-in needed, and it plays in
            any browser.
          </span>
        </span>
      </label>

      {!published && (
        <p style={{ fontSize: 12, color: '#a8631f', margin: '10px 0 0' }}>
          Publish the album first — only a published album can be shared.
        </p>
      )}

      {shared && published && (
        <div style={linkRow}>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} style={linkInput} />
          <button type="button" onClick={copy} style={ghostBtn}>Copy</button>
          <a href={link} target="_blank" rel="noreferrer" style={ghostBtn}>Open</a>
        </div>
      )}

      <div style={{ height: 1, background: '#EDEFEC', margin: '20px 0' }} />

      {/* Autoplay */}
      <label style={row}>
        <input
          type="checkbox"
          checked={play}
          onChange={(e) => savePlayback(e.target.checked, seconds)}
          style={{ width: 16, height: 16, accentColor: '#8BC53F' }}
        />
        <span>
          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#123528' }}>
            Play automatically
          </span>
          <span style={{ display: 'block', fontSize: 12.5, color: '#8b968f', marginTop: 2 }}>
            Pages turn on their own when the album opens. Viewers can pause at any time.
          </span>
        </span>
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: '#5b6660' }}>Seconds per page</span>
        <input
          type="number"
          min={2}
          max={30}
          value={seconds}
          onChange={(e) => setSeconds(Number(e.target.value))}
          onBlur={() => savePlayback(play, seconds)}
          style={{ width: 84, height: 34, borderRadius: 9, border: '1px solid #D8E0DC', padding: '0 10px', fontSize: 13.5 }}
        />
      </div>

      {note && <p style={{ fontSize: 12.5, color: '#16a34a', marginTop: 12 }}>{note}</p>}
      {error && <p style={{ fontSize: 12.5, color: '#dc2626', marginTop: 12 }}>{error}</p>}
    </div>
  );
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 24,
};
const heading: React.CSSProperties = {
  fontSize: 14, fontWeight: 800, color: '#0F3D2E', marginBottom: 14,
};
const row: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
};
const linkRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap',
  background: '#FAFBF9', border: '1px solid #EDEFEC', borderRadius: 12, padding: 10,
};
const linkInput: React.CSSProperties = {
  flex: '1 1 240px', minWidth: 0, border: 'none', background: 'transparent',
  fontSize: 12.5, color: '#123528', outline: 'none', fontFamily: 'inherit',
};
const ghostBtn: React.CSSProperties = {
  background: '#fff', color: '#123528', border: '1px solid #D8E0DC', borderRadius: 9,
  padding: '8px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-block',
};
