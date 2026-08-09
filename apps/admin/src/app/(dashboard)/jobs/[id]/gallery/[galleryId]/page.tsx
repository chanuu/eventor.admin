import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deletePhoto, updateGalleryStatus, updateGallery } from '../actions';
import GalleryUploadForm from './GalleryUploadForm';

type Gallery = {
  id: string;
  title: string;
  status: string;
  selection_deadline: string | null;
  job_id: string;
};

type Photo = {
  id: string;
  storage_path: string;
  file_name: string;
  sort_order: number;
  is_selected: boolean;
  selected_at: string | null;
};

type Job = { id: string; title: string; studio_id: string };

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string; nextColor?: string }> = {
  hidden:   { label: 'Hidden',   color: '#6b7280', next: 'proofing', nextLabel: 'Send to Proofing', nextColor: '#d97706' },
  proofing: { label: 'Proofing', color: '#d97706', next: 'approved', nextLabel: 'Mark Approved',    nextColor: '#059669' },
  approved: { label: 'Approved', color: '#059669' },
};

export default async function GalleryDetailPage({ params, searchParams }: {
  params: { id: string; galleryId: string };
  searchParams: { saved?: string };
}) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, studio_id')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as Job;

  const { data: galleryRaw } = await supabase
    .from('galleries')
    .select('id, title, status, selection_deadline, job_id')
    .eq('id', params.galleryId)
    .eq('job_id', params.id)
    .single();

  if (!galleryRaw) notFound();
  const gallery = galleryRaw as Gallery;

  const { data: photosRaw } = await supabase
    .from('gallery_photos')
    .select('id, storage_path, file_name, sort_order, is_selected, selected_at')
    .eq('gallery_id', params.galleryId)
    .eq('is_active', true)
    .order('sort_order');

  const photos = (photosRaw ?? []) as Photo[];

  // Generate signed URLs for thumbnails (1 hour expiry)
  const admin = createAdminClient();
  const signedUrls: Record<string, string> = {};
  if (photos.length > 0) {
    const { data: signed } = await admin.storage
      .from('gallery-photos')
      .createSignedUrls(photos.map((p) => p.storage_path), 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) signedUrls[photos[i].id] = s.signedUrl;
    });
  }

  const statusCfg = STATUS_CONFIG[gallery.status] ?? STATUS_CONFIG.hidden;
  const selectedCount = photos.filter((p) => p.is_selected).length;
  const deadlineValue = gallery.selection_deadline ? gallery.selection_deadline.slice(0, 10) : '';

  const updateAction = updateGallery.bind(null, gallery.id, params.id, job.studio_id);

  return (
    <div style={{ maxWidth: 920 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href={`/jobs/${params.id}/gallery`} style={{ fontSize: 13, color: '#6b7280' }}>
          ← {job.title} / Galleries
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{gallery.title}</h1>
          <span style={{ fontSize: 12, fontWeight: 600, color: statusCfg.color, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '3px 10px' }}>
            {statusCfg.label}
          </span>
        </div>
        {searchParams.saved && <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Status card */}
        <div style={card}>
          <h2 style={sectionHeading}>Status</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <span style={{ fontWeight: 600, color: statusCfg.color }}>{statusCfg.label}</span>
                {gallery.status === 'proofing' && (
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>
                    {selectedCount} of {photos.length} selected by client
                  </span>
                )}
                {gallery.status === 'approved' && selectedCount > 0 && (
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>
                    {selectedCount} photo{selectedCount !== 1 ? 's' : ''} selected
                  </span>
                )}
              </p>
              {gallery.selection_deadline && (
                <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, marginBottom: 0 }}>
                  Selection deadline: {new Date(gallery.selection_deadline).toLocaleDateString('en-LK', { dateStyle: 'long' })}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {statusCfg.next && (
                <form action={updateGalleryStatus.bind(null, gallery.id, params.id, job.studio_id, statusCfg.next)}>
                  <button type="submit" style={{ ...primaryBtn, background: statusCfg.next === 'approved' ? '#059669' : '#2563eb' }}>
                    {statusCfg.nextLabel}
                  </button>
                </form>
              )}
              {gallery.status !== 'hidden' && (
                <form action={updateGalleryStatus.bind(null, gallery.id, params.id, job.studio_id, 'hidden')}>
                  <button type="submit" style={ghostBtn}>Set Hidden</button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Settings card */}
        <div style={card}>
          <h2 style={sectionHeading}>Gallery Settings</h2>
          <form action={updateAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Title" required>
                <input name="title" required defaultValue={gallery.title} style={inputStyle} />
              </Field>
              <Field label="Selection Deadline">
                <input name="selection_deadline" type="date" defaultValue={deadlineValue} style={inputStyle} />
              </Field>
            </div>
            <div>
              <button type="submit" style={secondaryBtn}>Save Settings</button>
            </div>
          </form>
        </div>

        {/* Upload card */}
        <div style={card}>
          <h2 style={sectionHeading}>Upload Photos</h2>
          <GalleryUploadForm galleryId={gallery.id} jobId={params.id} studioId={job.studio_id} />
        </div>

        {/* Photo grid */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
            <h2 style={{ ...sectionHeading, marginBottom: 0 }}>
              {photos.length} Photo{photos.length !== 1 ? 's' : ''}
            </h2>
            {selectedCount > 0 && (
              <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                {selectedCount} selected
              </span>
            )}
          </div>

          {photos.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    position: 'relative',
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: photo.is_selected ? '2px solid #2563eb' : '2px solid #e5e7eb',
                    background: '#f3f4f6',
                    aspectRatio: '1',
                  }}
                >
                  {signedUrls[photo.id] ? (
                    <img
                      src={signedUrls[photo.id]}
                      alt={photo.file_name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>No preview</span>
                    </div>
                  )}

                  {/* Selected badge */}
                  {photo.is_selected && (
                    <div style={{ position: 'absolute', top: 6, left: 6, background: '#2563eb', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
                    </div>
                  )}

                  {/* Delete button */}
                  <form
                    action={deletePhoto.bind(null, photo.id, photo.storage_path, gallery.id, params.id, job.studio_id)}
                    style={{ position: 'absolute', top: 5, right: 5 }}
                  >
                    <button
                      type="submit"
                      title={`Delete ${photo.file_name}`}
                      style={{
                        width: 22, height: 22, borderRadius: 99,
                        background: 'rgba(0,0,0,0.55)', border: 'none',
                        cursor: 'pointer', color: '#fff', fontSize: 14,
                        lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </form>

                  {/* Filename overlay */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.55))', padding: '14px 6px 6px' }}>
                    <p style={{ fontSize: 10, color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {photo.file_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: '24px 0', margin: 0 }}>
              No photos yet. Upload some above to get started.
            </p>
          )}
        </div>

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

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 24 };
const sectionHeading: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 };
const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const ghostBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: 'none', color: '#6b7280', border: '1px solid #d1d5db', fontWeight: 500, cursor: 'pointer', padding: '0 14px', fontSize: 13 };
