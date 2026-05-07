import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Gallery = {
  id: string;
  title: string;
  status: string;
  selection_deadline: string | null;
};

type Photo = {
  id: string;
  storage_path: string;
  file_name: string;
  is_selected: boolean;
  sort_order: number;
};

const STORAGE_BUCKET = 'gallery-photos';

export default function GalleryPage() {
  const { jobId, galleryId } = useParams<{ jobId: string; galleryId: string }>();
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!galleryId) return;

    Promise.all([
      supabase
        .from('galleries')
        .select('id, title, status, selection_deadline')
        .eq('id', galleryId)
        .single(),
      supabase
        .from('gallery_photos')
        .select('id, storage_path, file_name, is_selected, sort_order')
        .eq('gallery_id', galleryId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
    ]).then(([galleryRes, photosRes]) => {
      setGallery(galleryRes.data as Gallery | null);
      const p = (photosRes.data ?? []) as Photo[];
      setPhotos(p);
      setSelected(new Set(p.filter((ph) => ph.is_selected).map((ph) => ph.id)));
      setLoading(false);
    });
  }, [galleryId]);

  const togglePhoto = useCallback(
    (id: string) => {
      if (gallery?.status !== 'proofing') return;
      setSaved(false);
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [gallery?.status],
  );

  async function handleSave() {
    if (!gallery || gallery.status !== 'proofing') return;
    setSaving(true);

    // Batch updates — send all in parallel
    await Promise.all(
      photos.map((ph) =>
        supabase
          .from('gallery_photos')
          .update({
            is_selected: selected.has(ph.id),
            selected_at: selected.has(ph.id) ? new Date().toISOString() : null,
          })
          .eq('id', ph.id),
      ),
    );

    setSaving(false);
    setSaved(true);
  }

  function getPhotoUrl(storagePath: string): string {
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  if (loading) return <p style={loadingStyle}>Loading…</p>;
  if (!gallery) return <p style={{ color: '#dc2626', fontSize: 14 }}>Gallery not found.</p>;

  const canSelect = gallery.status === 'proofing';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to={`/jobs/${jobId}`} style={{ fontSize: 13, color: '#6b7280' }}>← Back to job</Link>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 8, gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>{gallery.title}</h1>
            {canSelect && gallery.selection_deadline && (
              <p style={{ fontSize: 13, color: '#f59e0b', marginTop: 4 }}>
                Please select your favourites by{' '}
                <strong>{new Date(gallery.selection_deadline).toLocaleDateString('en-LK', { dateStyle: 'long' })}</strong>
              </p>
            )}
            {!canSelect && gallery.status === 'approved' && (
              <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Your selections have been approved.</p>
            )}
          </div>
          {canSelect && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {selected.size} of {photos.length} selected
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  height: 36,
                  borderRadius: 6,
                  background: saved ? '#dcfce7' : '#2563eb',
                  color: saved ? '#166534' : '#fff',
                  border: 'none',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: '0 18px',
                  fontSize: 13,
                }}
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save selections'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions for proofing */}
      {canSelect && photos.length > 0 && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#1e40af' }}>
          Click any photo to select or deselect it. Press <strong>Save selections</strong> when you're done.
        </div>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 8, fontSize: 14 }}>
          No photos have been added to this gallery yet.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {photos.map((ph) => {
            const isSelected = selected.has(ph.id);
            return (
              <div
                key={ph.id}
                onClick={() => togglePhoto(ph.id)}
                title={ph.file_name}
                style={{
                  position: 'relative',
                  aspectRatio: '1',
                  borderRadius: 6,
                  overflow: 'hidden',
                  cursor: canSelect ? 'pointer' : 'default',
                  border: `3px solid ${isSelected ? '#2563eb' : 'transparent'}`,
                  boxSizing: 'border-box',
                  background: '#f3f4f6',
                }}
              >
                <img
                  src={getPhotoUrl(ph.storage_path)}
                  alt={ph.file_name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Selection indicator */}
                {canSelect && (
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isSelected ? '#2563eb' : 'rgba(255,255,255,0.7)',
                    border: `2px solid ${isSelected ? '#2563eb' : '#d1d5db'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.1s',
                  }}>
                    {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </div>
                )}
                {/* Approved selection overlay */}
                {!canSelect && gallery.status === 'approved' && ph.is_selected && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(22,101,52,0.7)',
                    padding: '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}>
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>✓ Selected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const loadingStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 14, padding: '32px 0' };
