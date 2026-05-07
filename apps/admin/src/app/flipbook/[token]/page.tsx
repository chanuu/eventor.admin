import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';

type Flipbook = {
  id: string;
  storage_path: string | null;
  published_at: string | null;
  studios: { name: string } | null;
};

const STORAGE_BUCKET = 'flipbooks';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

export default async function PublicFlipbookPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: raw } = await admin
    .from('flipbooks')
    .select('id, storage_path, published_at, studios(name)')
    .eq('share_token', params.token)
    .not('published_at', 'is', null)
    .maybeSingle();

  if (!raw) notFound();
  const flipbook = raw as unknown as Flipbook;

  if (!flipbook.storage_path) {
    return (
      <div style={centerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#9ca3af', fontSize: 14 }}>This flipbook has no file yet.</p>
        </div>
      </div>
    );
  }

  // Generate signed URL so the PDF is accessible regardless of storage bucket policy
  const { data: signedData, error: signErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(flipbook.storage_path, SIGNED_URL_EXPIRY);

  if (signErr || !signedData?.signedUrl) {
    return (
      <div style={centerStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#dc2626', fontSize: 14 }}>Unable to load flipbook. The link may have expired.</p>
        </div>
      </div>
    );
  }

  const studioName = (flipbook.studios as { name: string } | null)?.name ?? 'Studio';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#111827' }}>
      {/* Minimal header */}
      <div style={{
        background: '#1f2937',
        borderBottom: '1px solid #374151',
        padding: '0 20px',
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{ color: '#f9fafb', fontWeight: 600, fontSize: 14 }}>{studioName}</span>
        <a
          href={signedData.signedUrl}
          download
          style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'none' }}
        >
          Download PDF ↓
        </a>
      </div>

      {/* PDF viewer */}
      <iframe
        src={signedData.signedUrl}
        style={{ flex: 1, border: 'none', width: '100%' }}
        title="Flipbook"
      />
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f9fafb',
};
const cardStyle: React.CSSProperties = {
  padding: 32,
  background: '#fff',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  textAlign: 'center',
};
