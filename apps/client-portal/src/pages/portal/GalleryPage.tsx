import { useState } from 'react';
import { C, solidBtn } from '../../lib/theme';
import { shortDate } from '../../lib/format';
import { usePortal, photoUrl, galleriesVisible, type Photo } from '../../lib/portal';
import { Screen, Card, Empty } from '../../components/ui';

export default function GalleryPage() {
  const { job } = usePortal();
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  const galleries = galleriesVisible(job).filter((g) => g.status !== 'proofing');
  const proofing = galleriesVisible(job).filter((g) => g.status === 'proofing');

  if (galleries.length === 0 && proofing.length === 0) {
    return (
      <Screen>
        <Empty>Your galleries will appear here once your studio publishes them.</Empty>
      </Screen>
    );
  }

  return (
    <Screen>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {galleries.map((g) => (
          <Card key={g.id} style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>{g.title}</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
                  {g.photos.length} photo{g.photos.length === 1 ? '' : 's'} · shared {shortDate(g.created_at)} · private link
                </div>
              </div>
              {g.photos.length > 0 && (
                <a
                  href={photoUrl(g.photos[0].storage_path)}
                  target="_blank" rel="noreferrer"
                  style={{ ...solidBtn, padding: '11px 20px', display: 'inline-block' }}
                >
                  Open full size
                </a>
              )}
            </div>

            {g.photos.length > 0 ? (
              <div className="grid-photos" style={{ marginTop: 18 }}>
                {g.photos.map((p) => (
                  <button key={p.id} onClick={() => setLightbox(p)} style={thumbBtn}>
                    <img src={photoUrl(p.storage_path)} alt={p.file_name} style={thumb} />
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14 }}>No photos in this gallery yet.</p>
            )}
          </Card>
        ))}

        {proofing.map((g) => (
          <div key={g.id} style={{
            background: C.white, border: `1px dashed ${C.borderBtn}`, borderRadius: 16, padding: 34, textAlign: 'center',
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.green }}>{g.title}</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
              This set is open for proofing — choose your favourites on the Proofing screen.
            </div>
          </div>
        ))}
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={lightboxWrap}>
          <img src={photoUrl(lightbox.storage_path)} alt={lightbox.file_name} style={lightboxImg} />
        </div>
      )}
    </Screen>
  );
}

const thumbBtn: React.CSSProperties = {
  padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', borderRadius: 12, overflow: 'hidden',
};

const thumb: React.CSSProperties = { width: '100%', height: 120, objectFit: 'cover', display: 'block', borderRadius: 12 };

const lightboxWrap: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,61,46,0.88)', zIndex: 80,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, cursor: 'zoom-out',
};

const lightboxImg: React.CSSProperties = {
  maxWidth: '100%', maxHeight: '100%', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
};
