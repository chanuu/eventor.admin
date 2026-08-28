import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { C, FONT } from '../lib/theme';
import { albumPageUrl, type AlbumPageRow } from '../lib/portal';
import FlipAlbum, { type AlbumPage as FlipPage } from '../components/FlipAlbum';

type SharedAlbum = {
  id: string;
  title: string | null;
  cover_kicker: string | null;
  cover_title: string | null;
  cover_body: string | null;
  closing_kicker: string | null;
  closing_title: string | null;
  closing_body: string | null;
  music_enabled: boolean;
  music_url: string | null;
  autoplay: boolean;
  autoplay_seconds: number;
  album_pages: AlbumPageRow[];
};

/**
 * The album as shared with friends and family — no account, no portal chrome.
 * Reachable only while the studio keeps sharing switched on; RLS enforces that,
 * so an old link stops working the moment they turn it off.
 */
export default function PublicAlbum() {
  const { token } = useParams<{ token: string }>();
  const [album, setAlbum] = useState<SharedAlbum | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    supabase
      .from('albums')
      .select(`
        id, title, cover_kicker, cover_title, cover_body,
        closing_kicker, closing_title, closing_body,
        music_enabled, music_url, autoplay, autoplay_seconds,
        album_pages(id, image_url, caption, sort_order, gallery_photos(storage_path))
      `)
      .eq('share_token', token)
      .maybeSingle()
      .then(({ data }) => {
        setAlbum((data as unknown as SharedAlbum) ?? null);
        setLoading(false);
      });
  }, [token]);

  const pages = useMemo<FlipPage[]>(() => {
    if (!album) return [];

    const built = [...(album.album_pages ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({ url: albumPageUrl(p), caption: p.caption }))
      .filter((p): p is { url: string; caption: string | null } => !!p.url);

    if (built.length === 0) return [];

    return [
      {
        kind: 'cover',
        kicker: album.cover_kicker || 'Digital Album',
        title: album.cover_title || album.title || 'Our album',
        body: album.cover_body || '',
      },
      ...built.map((p) => ({ kind: 'photo' as const, url: p.url, caption: p.caption })),
      {
        kind: 'cover',
        kicker: album.closing_kicker || 'Thank you',
        title: album.closing_title || 'With love',
        body: album.closing_body || '',
      },
    ];
  }, [album]);

  if (loading) return <div style={message}>Opening the album…</div>;

  if (!album || pages.length === 0) {
    return (
      <div style={message}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.white }}>Album unavailable</div>
          <p style={{ marginTop: 10, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', fontSize: 13.5 }}>
            This link is no longer shared, or it was mistyped. Ask whoever sent it for an up-to-date link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <FlipAlbum
      pages={pages}
      title={album.cover_title || album.title || 'Digital Album'}
      musicEnabled={album.music_enabled}
      musicUrl={album.music_url}
      autoplay={album.autoplay}
      autoplaySeconds={album.autoplay_seconds}
    />
  );
}

const message: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'radial-gradient(circle at 50% 0%,#17513C,#0B2A20 70%)',
  color: 'rgba(255,255,255,0.75)', fontFamily: FONT, fontSize: 14, padding: 24,
};
