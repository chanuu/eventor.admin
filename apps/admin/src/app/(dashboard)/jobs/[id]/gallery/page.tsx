import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createGallery } from './actions';

type Gallery = {
  id: string;
  title: string;
  status: string;
  selection_deadline: string | null;
  selection_submitted_at: string | null;
  created_at: string;
};

type Job = { id: string; title: string; studio_id: string };

type Shoot = { id: string; shoot_type: string | null; scheduled_at: string | null };

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  hidden:   { bg: '#f3f4f6', color: '#6b7280', label: 'Hidden'   },
  proofing: { bg: '#fef3c7', color: '#92400e', label: 'Proofing' },
  approved: { bg: '#d1fae5', color: '#065f46', label: 'Approved' },
};

export default async function GalleryListPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, studio_id')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as Job;

  const [{ data: galleriesRaw }, { data: photoCounts }, { data: shootsRaw }] = await Promise.all([
    supabase
      .from('galleries')
      .select('id, title, status, selection_deadline, selection_submitted_at, created_at')
      .eq('job_id', params.id)
      .order('created_at'),
    createAdminClient()
      .from('gallery_photos')
      .select('gallery_id')
      .eq('studio_id', job.studio_id)
      .eq('is_active', true),
    supabase
      .from('shoots')
      .select('id, shoot_type, scheduled_at')
      .eq('job_id', params.id)
      .order('scheduled_at'),
  ]);

  const galleries = (galleriesRaw ?? []) as Gallery[];
  const shoots = (shootsRaw ?? []) as Shoot[];

  const countByGallery: Record<string, number> = {};
  ((photoCounts ?? []) as { gallery_id: string }[]).forEach(({ gallery_id }) => {
    countByGallery[gallery_id] = (countByGallery[gallery_id] ?? 0) + 1;
  });

  const createAction = createGallery.bind(null, job.id, job.studio_id);

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 24 }}>
        <a href={`/jobs/${params.id}`} style={{ fontSize: 13, color: '#6b7280' }}>← {job.title}</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Galleries</h1>
      </div>

      {galleries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {galleries.map((g) => {
            const badge = STATUS_BADGE[g.status] ?? STATUS_BADGE.hidden;
            const count = countByGallery[g.id] ?? 0;
            return (
              <a
                key={g.id}
                href={`/jobs/${params.id}/gallery/${g.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: 0 }}>{g.title}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 3, marginBottom: 0 }}>
                    {count} photo{count !== 1 ? 's' : ''}
                    {g.selection_deadline && ` · Deadline ${new Date(g.selection_deadline).toLocaleDateString('en-LK', { dateStyle: 'medium' })}`}
                  </p>
                </div>
                {g.status === 'proofing' && g.selection_submitted_at && (
                  <span style={{ fontSize: 12, fontWeight: 700, background: '#8BC53F', color: '#0F3D2E', padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                    Selection submitted
                  </span>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                  {badge.label}
                </span>
                <span style={{ fontSize: 13, color: '#0F3D2E', fontWeight: 500, flexShrink: 0 }}>Open →</span>
              </a>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>No galleries yet for this job.</p>
      )}

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 24 }}>
        <h2 style={sectionHeading}>New Gallery</h2>
        <form action={createAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Gallery Title" required>
            <input name="title" required placeholder="e.g. Wedding Day Photos" style={inputStyle} />
          </Field>
          {shoots.length > 0 && (
            <Field label="Link to Shoot (optional)">
              <select name="shoot_id" style={{ ...inputStyle, color: '#374151' }}>
                <option value="">— Not linked to a specific shoot —</option>
                {shoots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shoot_type ?? 'Shoot'}
                    {s.scheduled_at ? ` · ${new Date(s.scheduled_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Selection Deadline (optional)">
            <input name="selection_deadline" type="date" style={inputStyle} />
          </Field>
          <div>
            <button type="submit" style={primaryBtn}>Create Gallery</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const sectionHeading: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 };
const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
