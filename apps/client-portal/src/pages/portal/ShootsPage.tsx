import { useNavigate } from 'react-router-dom';
import { C, card, solidBtn, ghostBtn, statusBadge } from '../../lib/theme';
import { dateTime } from '../../lib/format';
import { usePortal, photoUrl, type Shoot } from '../../lib/portal';
import { Screen, Empty } from '../../components/ui';

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled', shot: 'Shot', editing: 'Editing', done: 'Delivered',
};

export default function ShootsPage() {
  const { job } = usePortal();
  const navigate = useNavigate();
  const base = `/portal/${job.id}`;

  if (job.shoots.length === 0) {
    return (
      <Screen>
        <Empty>No sessions have been scheduled for this event yet.</Empty>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {job.shoots.map((sh) => {
          const gallery = job.galleries.find((g) => g.shoot_id === sh.id && g.status !== 'hidden');
          const cover = gallery?.photos[0];
          const kind = statusKind(sh);

          return (
            <div key={sh.id} style={{ ...card, padding: 18, display: 'flex', gap: 18, alignItems: 'center' }}>
              {cover
                ? <img src={photoUrl(cover.storage_path)} alt=""
                    style={{ width: 132, height: 92, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                : <div style={coverPlaceholder}>No cover yet</div>}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>{sh.shoot_type ?? 'Shoot'}</div>
                  <span style={statusBadge(kind)}>{STATUS_LABEL[sh.status] ?? sh.status}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 6 }}>
                  {[dateTime(sh.scheduled_at), sh.venue].filter(Boolean).join(' · ')}
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
                  {sh.crew.length ? sh.crew.join(', ') : 'Crew being assigned'}
                  {gallery ? ` · ${gallery.photos.length} photo${gallery.photos.length === 1 ? '' : 's'} shared` : ''}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                {gallery ? (
                  <button
                    onClick={() => navigate(`${base}/${gallery.status === 'proofing' ? 'proofing' : 'gallery'}`)}
                    style={solidBtn}
                  >
                    {gallery.status === 'proofing' ? 'Start proofing' : 'View gallery'}
                  </button>
                ) : (
                  <button onClick={() => navigate(`${base}/event`)} style={ghostBtn}>View timeline</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}

function statusKind(sh: Shoot): 'done' | 'active' | 'neutral' {
  if (sh.status === 'done') return 'done';
  if (sh.scheduled_at && new Date(sh.scheduled_at).getTime() >= Date.now()) return 'active';
  return 'neutral';
}

const coverPlaceholder: React.CSSProperties = {
  width: 132, height: 92, borderRadius: 12, flexShrink: 0, background: C.panel,
  border: `1px solid ${C.borderSoft}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 11, color: C.muted,
};
