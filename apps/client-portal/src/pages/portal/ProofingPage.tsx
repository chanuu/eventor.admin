import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { C, solidBtn, ghostBtn, statusBadge } from '../../lib/theme';
import { shortDate } from '../../lib/format';
import { usePortal, photoUrl, galleriesVisible } from '../../lib/portal';
import { Screen, Card, Bar, Empty, Toast } from '../../components/ui';

export default function ProofingPage() {
  const { job, reload } = usePortal();

  const collections = useMemo(
    () => galleriesVisible(job).filter((g) => g.status === 'proofing' || g.status === 'delivered'),
    [job],
  );
  const openable = collections.filter((g) => g.status === 'proofing');

  const [openId, setOpenId] = useState<string | null>(openable[0]?.id ?? null);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'picked'>('all');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const active = collections.find((g) => g.id === openId) ?? null;

  // Seed selection from what the studio already has on record.
  useEffect(() => {
    if (!active) return;
    setPicks(new Set(active.photos.filter((p) => p.is_selected).map((p) => p.id)));
    setFilter('all');
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (collections.length === 0) {
    return (
      <Screen>
        <Empty>Nothing to proof yet. When your studio opens a set for selection, it appears here.</Empty>
      </Screen>
    );
  }

  const canEdit = active?.status === 'proofing';

  function toggle(id: string) {
    if (!canEdit) return;
    setPicks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    if (!active || !canEdit) return;
    if (picks.size === 0) { setToast('Select at least one photo first.'); return; }
    setSaving(true);

    const now = new Date().toISOString();
    const results = await Promise.all(
      active.photos.map((p) => {
        const selected = picks.has(p.id);
        if (selected === p.is_selected) return Promise.resolve({ error: null });
        return supabase
          .from('gallery_photos')
          .update({ is_selected: selected, selected_at: selected ? now : null })
          .eq('id', p.id);
      }),
    );

    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) { setToast(`Could not save: ${failed.error.message}`); return; }

    setToast(`Selection of ${picks.size} photo${picks.size === 1 ? '' : 's'} sent to ${job.studio?.name ?? 'your studio'}.`);
    reload();
  }

  const visiblePhotos = active
    ? active.photos.filter((p) => filter === 'all' || picks.has(p.id))
    : [];

  return (
    <Screen>
      {/* ── Collections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {collections.map((c) => {
          const isOpen = c.id === openId;
          const chosen = c.id === active?.id ? picks.size : c.photos.filter((p) => p.is_selected).length;
          const proofing = c.status === 'proofing';
          return (
            <div key={c.id} style={{
              background: C.white, border: `1px solid ${isOpen && proofing ? C.lime : C.border}`,
              borderRadius: 16, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                {c.photos[0]
                  ? <img src={photoUrl(c.photos[0].storage_path)} alt=""
                      style={{ width: 104, height: 74, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                  : <div style={coverPlaceholder}>No photos</div>}

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>{c.title}</div>
                    <span style={statusBadge(proofing ? 'active' : 'done')}>
                      {proofing ? 'Your turn' : 'Closed'}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 5 }}>
                    {c.photos.length} proof{c.photos.length === 1 ? '' : 's'} uploaded by {job.studio?.name ?? 'your studio'}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                    {c.selection_deadline
                      ? `Please respond by ${shortDate(c.selection_deadline)}`
                      : 'No deadline set'}
                  </div>
                </div>

                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: C.muted }}>{chosen} of {c.photos.length} picked</div>
                  <div style={{ width: 150, marginTop: 6 }}>
                    <Bar
                      percent={c.photos.length ? (chosen / c.photos.length) * 100 : 0}
                      color={proofing ? C.lime : '#C8D6BC'}
                      height={8}
                    />
                  </div>
                  <button
                    onClick={() => setOpenId(c.id)}
                    style={{ ...(isOpen ? ghostBtn : solidBtn), marginTop: 10 }}
                  >
                    {isOpen ? 'Reviewing' : proofing ? 'Start proofing' : 'View selection'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Open proofing grid ── */}
      {active && (
        <Card style={{ padding: 24, marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>{active.title}</div>
              <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4, maxWidth: 560 }}>
                {canEdit
                  ? 'Tap a photo to choose it for your album, then submit your selection to the studio.'
                  : 'This set is closed. Below is the selection on record.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => setFilter('all')} style={chip(filter === 'all')}>All {active.photos.length}</button>
              <button onClick={() => setFilter('picked')} style={chip(filter === 'picked')}>Selected {picks.size}</button>
            </div>
          </div>

          {visiblePhotos.length > 0 ? (
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
              {visiblePhotos.map((p) => {
                const on = picks.has(p.id);
                return (
                  <div key={p.id} style={tile(on)}>
                    <div style={{ position: 'relative' }}>
                      <img src={photoUrl(p.storage_path)} alt={p.file_name}
                        style={{ width: '100%', height: 112, objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                      <button
                        onClick={() => toggle(p.id)}
                        disabled={!canEdit}
                        title={canEdit ? 'Select for album' : 'Selection closed'}
                        style={check(on, canEdit)}
                      >
                        {on ? '✓' : '+'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: C.muted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.file_name}
                      </span>
                      {on && <span style={inAlbum}>In album</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: C.muted, marginTop: 18 }}>
              {filter === 'picked' ? 'You haven’t selected any photos yet.' : 'No photos in this set yet.'}
            </p>
          )}

          {canEdit && (
            <div style={footer}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: C.green }}>
                  {picks.size} of {active.photos.length} selected
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                  You can send fewer and add more later; the studio will follow up.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setPicks(new Set())} style={{ ...ghostBtn, padding: '11px 20px' }}>Clear all</button>
                <button onClick={submit} disabled={saving} style={submitBtn(picks.size > 0 && !saving)}>
                  {saving ? 'Sending…' : 'Submit selection'}
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {toast && <Toast message={toast} />}
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function chip(on: boolean): React.CSSProperties {
  return {
    borderRadius: 20, padding: '7px 14px', fontSize: 11.5, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    ...(on
      ? { background: C.green, color: C.white, border: 'none' }
      : { background: C.white, color: C.textMid, border: `1px solid ${C.borderBtn}` }),
  };
}

function tile(on: boolean): React.CSSProperties {
  return {
    borderRadius: 12, padding: 8, transition: 'background 0.15s ease, box-shadow 0.15s ease',
    background: on ? C.limeSoft : C.panel,
    boxShadow: on ? `inset 0 0 0 2px ${C.lime}` : `inset 0 0 0 1px ${C.borderSoft}`,
  };
}

function check(on: boolean, enabled: boolean): React.CSSProperties {
  return {
    position: 'absolute', top: 7, right: 7, width: 26, height: 26, borderRadius: '50%',
    cursor: enabled ? 'pointer' : 'default', fontSize: 13, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
    opacity: enabled || on ? 1 : 0.5,
    ...(on
      ? { background: C.lime, color: C.green, border: 'none' }
      : { background: 'rgba(255,255,255,0.92)', color: C.textMid, border: `1px solid ${C.borderBtn}` }),
  };
}

function submitBtn(enabled: boolean): React.CSSProperties {
  return {
    border: 'none', borderRadius: 9, padding: '11px 22px', fontSize: 12.5, fontWeight: 700,
    cursor: enabled ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
    ...(enabled ? { background: C.green, color: C.white } : { background: '#DDE3DE', color: C.muted }),
  };
}

const footer: React.CSSProperties = {
  marginTop: 22, borderTop: `1px solid ${C.borderSoft}`, paddingTop: 18,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14,
};

const inAlbum: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 800, color: C.limeSoftText, background: C.limeSoft,
  borderRadius: 20, padding: '2px 8px', flexShrink: 0,
};

const coverPlaceholder: React.CSSProperties = {
  width: 104, height: 74, borderRadius: 12, flexShrink: 0, background: C.panel,
  border: `1px solid ${C.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, color: C.muted,
};
