import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { supabase } from '../lib/supabase';
import { C, solidBtn } from '../lib/theme';
import { shortDate } from '../lib/format';
import { albumPageUrl, type AlbumPageRow } from '../lib/portal';
import { Card, CardTitle } from './ui';

const MAX_COMMENT = 2000;
const COLUMNS = 'id, album_page_id, body, created_at, resolved_at';

type Comment = {
  id: string;
  album_page_id: string | null;
  body: string;
  created_at: string;
  resolved_at: string | null;
};

/**
 * Lets a client tell the studio what to change, page by page.
 *
 * Only the signed-in portal shows this. The public share link has no access to
 * comments at all, which the database enforces rather than this component.
 */
export default function AlbumComments({ albumId, pages }: { albumId: string; pages: AlbumPageRow[] }) {
  const usable = useMemo(
    () => pages.flatMap((page) => {
      const url = albumPageUrl(page);
      return url ? [{ page, url }] : [];
    }),
    [pages],
  );
  const [comments, setComments] = useState<Comment[]>([]);
  const [pageId, setPageId] = useState(usable[0]?.page.id ?? '');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let current = true;
    supabase
      .from('album_comments')
      .select(COLUMNS)
      .eq('album_id', albumId)
      .order('created_at')
      .then(({ data, error: loadError }) => {
        if (!current) return;
        if (loadError) setError('Comments could not be loaded. Please try again later.');
        else setComments((data ?? []) as Comment[]);
      });
    return () => { current = false; };
  }, [albumId]);

  if (!usable.length) return null;

  const chosen = usable.find((u) => u.page.id === pageId) ?? usable[0];
  const onThisPage = comments.filter((c) => c.album_page_id === chosen.page.id);
  const chosenAt = usable.indexOf(chosen) + 1;
  const label = `${chosen.page.is_spread ? 'Spread' : 'Page'} ${chosenAt}`;

  async function send() {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    // The album, the studio and who wrote it are all worked out by the database.
    const { data, error: sendError } = await supabase
      .from('album_comments')
      .insert({ album_page_id: chosen.page.id, body })
      .select(COLUMNS)
      .single();
    setSending(false);
    if (sendError) {
      setError('Your comment could not be sent. Please try again.');
      return;
    }
    setComments((all) => [...all, data as Comment]);
    setDraft('');
  }

  return (
    <Card style={{ marginTop: 16 }}>
      <CardTitle>Comments for your studio</CardTitle>
      <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6 }}>
        Choose a page and tell your studio what you would like changed. Only you and your studio
        can see these, not people you share the album link with.
      </p>

      <div style={strip} role="list" aria-label="Album pages">
        {usable.map(({ page, url }, i) => {
          const open = comments.filter((c) => c.album_page_id === page.id && !c.resolved_at).length;
          const on = page.id === chosen.page.id;
          return (
            <button
              key={page.id}
              type="button"
              aria-label={`${page.is_spread ? 'Spread' : 'Page'} ${i + 1}${open ? `, ${open} open` : ''}`}
              aria-pressed={on}
              onClick={() => { setPageId(page.id); setError(''); }}
              style={{ ...thumb, borderColor: on ? C.brand : C.border }}
            >
              <img src={url} alt="" loading="lazy" style={thumbImage} />
              {open > 0 && <span style={badge}>{open}</span>}
            </button>
          );
        })}
      </div>

      <img src={chosen.url} alt={label} style={preview} />

      <div style={{ fontSize: 13, fontWeight: 600, color: C.green, marginTop: 14 }}>{label}</div>
      {onThisPage.length === 0 && (
        <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 6 }}>No comments on this page yet.</p>
      )}
      {onThisPage.map((comment) => (
        <div key={comment.id} style={{ ...bubble, opacity: comment.resolved_at ? 0.7 : 1 }}>
          <div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{comment.body}</div>
          <div style={meta}>
            {shortDate(comment.created_at)}
            {comment.resolved_at && <strong style={resolved}>Resolved</strong>}
          </div>
        </div>
      ))}

      <textarea
        aria-label={`Comment on ${label}`}
        placeholder={`What would you like changed on ${label.toLowerCase()}?`}
        value={draft}
        maxLength={MAX_COMMENT}
        rows={3}
        onChange={(e) => setDraft(e.target.value)}
        style={field}
      />
      {error && <p role="alert" style={{ fontSize: 12.5, color: C.coral, marginTop: 6 }}>{error}</p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          type="button"
          onClick={() => void send()}
          disabled={!draft.trim() || sending}
          style={{ ...solidBtn, opacity: !draft.trim() || sending ? 0.55 : 1 }}
        >
          {sending ? 'Sending…' : 'Send comment'}
        </button>
      </div>
    </Card>
  );
}

const strip: CSSProperties = { display: 'flex', gap: 8, marginTop: 12, paddingBottom: 6, overflowX: 'auto' };
const thumb: CSSProperties = {
  position: 'relative', flex: 'none', width: 92, height: 54, padding: 0, overflow: 'hidden',
  background: C.panel, border: '2px solid', borderRadius: 8, cursor: 'pointer',
};
const thumbImage: CSSProperties = { display: 'block', width: '100%', height: '100%', objectFit: 'cover' };
const badge: CSSProperties = {
  position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, padding: '0 4px', fontSize: 10,
  fontWeight: 700, lineHeight: '16px', color: '#fff', background: C.brand, borderRadius: 8,
};
const preview: CSSProperties = {
  display: 'block', width: '100%', maxHeight: 360, marginTop: 10, objectFit: 'contain',
  background: C.panel, borderRadius: 10,
};
const bubble: CSSProperties = {
  marginTop: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5, color: C.green,
  background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10,
};
const meta: CSSProperties = { display: 'flex', gap: 8, marginTop: 5, fontSize: 11, color: C.textMid };
const resolved: CSSProperties = { color: C.brandDark, fontWeight: 700 };
const field: CSSProperties = {
  display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 12, padding: '10px 12px',
  fontFamily: 'inherit', fontSize: 13, color: C.green, background: C.white,
  border: `1px solid ${C.border}`, borderRadius: 10, resize: 'vertical',
};
