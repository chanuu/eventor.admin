import { EmptyState } from '@/components/states';
import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isS3Url } from '@/lib/s3';
import { requireFeature } from '@/lib/staff';
import { deletePhoto, updateGalleryStatus, updateGallery } from '../actions';
import GalleryUploadForm from './GalleryUploadForm';

type Gallery = {
  id: string;
  title: string;
  status: string;
  selection_deadline: string | null;
  selection_submitted_at: string | null;
  job_id: string;
};

type Photo = {
  id: string;
  storage_path: string;
  thumb_path: string | null;
  file_name: string;
  sort_order: number;
  is_selected: boolean;
  selected_at: string | null;
};

type Job = { id: string; title: string; studio_id: string };

/** Photos per page in the grid. */
const PHOTOS_PER_PAGE = 100;

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string; nextLabel?: string; nextColor?: string }> = {
  hidden:   { label: 'Hidden',   color: '#6b7280', next: 'proofing', nextLabel: 'Send to Proofing', nextColor: '#d97706' },
  proofing: { label: 'Proofing', color: '#d97706', next: 'approved', nextLabel: 'Mark Approved',    nextColor: '#059669' },
  approved: { label: 'Approved', color: '#059669' },
};

export default async function GalleryDetailPage({ params, searchParams }: {
  params: { id: string; galleryId: string };
  searchParams: { saved?: string; page?: string };
}) {
  // The list page gates on this too, but this page hosts the uploader and is
  // reachable directly by URL.
  await requireFeature('gallery');

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
    .select('id, title, status, selection_deadline, selection_submitted_at, job_id')
    .eq('id', params.galleryId)
    .eq('job_id', params.id)
    .single();

  if (!galleryRaw) notFound();
  const gallery = galleryRaw as Gallery;

  // A proofing set can run to four figures, so load a page at a time and let
  // the database do the counting instead of pulling every row to call .length.
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const rangeFrom = (page - 1) * PHOTOS_PER_PAGE;

  const [{ data: photosRaw }, { count: totalPhotos }, { count: selectedTotal }] = await Promise.all([
    supabase
      .from('gallery_photos')
      .select('id, storage_path, thumb_path, file_name, sort_order, is_selected, selected_at')
      .eq('gallery_id', params.galleryId)
      .eq('is_active', true)
      .order('sort_order')
      .range(rangeFrom, rangeFrom + PHOTOS_PER_PAGE - 1),
    supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', params.galleryId)
      .eq('is_active', true),
    supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('gallery_id', params.galleryId)
      .eq('is_active', true)
      .eq('is_selected', true),
  ]);

  const photos = (photosRaw ?? []) as Photo[];
  const photoCount = totalPhotos ?? 0;
  const pageCount = Math.max(1, Math.ceil(photoCount / PHOTOS_PER_PAGE));

  // S3-hosted photos store their public URL directly; legacy rows still hold a
  // Supabase storage path and need a signed URL (1 hour expiry).
  const signedUrls: Record<string, string> = {};
  const legacy = photos.filter((p) => !isS3Url(p.storage_path));
  photos.filter((p) => isS3Url(p.storage_path)).forEach((p) => { signedUrls[p.id] = p.storage_path; });

  if (legacy.length > 0) {
    const admin = createAdminClient();
    const { data: signed } = await admin.storage
      .from('gallery-photos')
      .createSignedUrls(legacy.map((p) => p.storage_path), 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) signedUrls[legacy[i].id] = s.signedUrl;
    });
  }

  const statusCfg = STATUS_CONFIG[gallery.status] ?? STATUS_CONFIG.hidden;
  const selectedCount = selectedTotal ?? 0;
  const deadlineValue = gallery.selection_deadline ? gallery.selection_deadline.slice(0, 10) : '';

  const updateAction = updateGallery.bind(null, gallery.id, params.id, job.studio_id);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href={`/jobs/${params.id}/gallery`} style={{ fontSize: 13, color: '#6b7280' }}>
          ← {job.title} / Galleries
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{gallery.title}</h1>
          <span style={{ fontSize: 12, fontWeight: 600, color: statusCfg.color, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 99, padding: '3px 10px' }}>
            {statusCfg.label}
          </span>
        </div>
        {searchParams.saved && <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Client submission banner — the studio's signal that proofing is done */}
        {gallery.status === 'proofing' && (
          gallery.selection_submitted_at ? (
            <div style={{ background: '#F1F6EC', border: '1px solid #DCE9CE', borderRadius: 12, padding: 18, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#8BC53F', color: '#0F3D2E', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
              <div style={{ flex: 1, minWidth: 220 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0F3D2E', margin: 0 }}>
                  Client submitted their selection
                </p>
                <p style={{ fontSize: 13, color: '#3f6b2b', margin: '3px 0 0' }}>
                  {selectedCount} of {photoCount} photo{photoCount !== 1 ? 's' : ''} chosen ·
                  {' '}{new Date(gallery.selection_submitted_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <form action={updateGalleryStatus.bind(null, gallery.id, params.id, job.studio_id, 'approved')}>
                <button type="submit" style={{ ...primaryBtn, background: '#059669' }}>
                  Mark Proofing Complete
                </button>
              </form>
            </div>
          ) : (
            <div style={{ background: '#FFF3E6', border: '1px solid #F3D9BC', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: '#a8631f', margin: 0 }}>
                Waiting for the client to submit
              </p>
              <p style={{ fontSize: 12.5, color: '#8a6a45', margin: '3px 0 0' }}>
                {selectedCount > 0
                  ? `They have ticked ${selectedCount} of ${photoCount} so far but have not sent the selection yet.`
                  : 'They have not started choosing yet.'}
              </p>
            </div>
          )
        )}

        {gallery.status === 'approved' && gallery.selection_submitted_at && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#166534', margin: 0 }}>Proofing complete</p>
            <p style={{ fontSize: 12.5, color: '#3f6b2b', margin: '3px 0 0' }}>
              {selectedCount} photo{selectedCount !== 1 ? 's' : ''} approved for the album ·
              client submitted {new Date(gallery.selection_submitted_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
            </p>
          </div>
        )}

        {/* Status card */}
        <div style={card}>
          <h2 style={sectionHeading}>Status</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
                <span style={{ fontWeight: 600, color: statusCfg.color }}>{statusCfg.label}</span>
                {gallery.status === 'proofing' && (
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 12 }}>
                    {selectedCount} of {photoCount} selected by client
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
                  <button type="submit" style={{ ...primaryBtn, background: statusCfg.next === 'approved' ? '#059669' : '#0F3D2E' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
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
              {photoCount} Photo{photoCount !== 1 ? 's' : ''}
            </h2>
            {selectedCount > 0 && (
              <span style={{ fontSize: 12, color: '#0F3D2E', fontWeight: 600 }}>
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
                    border: photo.is_selected ? '2px solid #0F3D2E' : '2px solid #e5e7eb',
                    background: '#f3f4f6',
                    aspectRatio: '1',
                  }}
                >
                  {photo.thumb_path || signedUrls[photo.id] ? (
                    <img
                      // Falls back to the full image for rows uploaded before
                      // thumbnails existed.
                      src={photo.thumb_path ?? signedUrls[photo.id]}
                      alt={photo.file_name}
                      loading="lazy"
                      decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>No preview</span>
                    </div>
                  )}

                  {/* Selected badge */}
                  {photo.is_selected && (
                    <div style={{ position: 'absolute', top: 6, left: 6, background: '#0F3D2E', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <EmptyState compact title="No photos yet" description="Upload photos above and they will appear here for proofing." />
            </p>
          )}

          {pageCount > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
              {page > 1 ? (
                <Link
                  href={`/jobs/${params.id}/gallery/${gallery.id}?page=${page - 1}`}
                  style={{ fontSize: 13, color: '#0F3D2E', fontWeight: 500 }}
                >
                  ← Previous
                </Link>
              ) : (
                <span style={{ fontSize: 13, color: '#d1d5db' }}>← Previous</span>
              )}

              <span style={{ fontSize: 12, color: '#6b7280' }}>
                Page {page} of {pageCount}
              </span>

              {page < pageCount ? (
                <Link
                  href={`/jobs/${params.id}/gallery/${gallery.id}?page=${page + 1}`}
                  style={{ fontSize: 13, color: '#0F3D2E', fontWeight: 500 }}
                >
                  Next →
                </Link>
              ) : (
                <span style={{ fontSize: 13, color: '#d1d5db' }}>Next →</span>
              )}
            </div>
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
const primaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const ghostBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: 'none', color: '#6b7280', border: '1px solid #d1d5db', fontWeight: 500, cursor: 'pointer', padding: '0 14px', fontSize: 13 };
