import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ensureFlipbook, publishFlipbook, unpublishFlipbook } from './actions';
import UploadForm from './UploadForm';

type Flipbook = {
  id: string;
  job_id: string;
  studio_id: string;
  storage_path: string | null;
  share_token: string;
  published_at: string | null;
};

type Job = { id: string; title: string; studio_id: string };

export default async function FlipbookPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, title, studio_id')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as Job;

  const { data: flipbookRaw } = await supabase
    .from('flipbooks')
    .select('id, job_id, studio_id, storage_path, share_token, published_at')
    .eq('job_id', params.id)
    .maybeSingle();

  const flipbook = flipbookRaw as Flipbook | null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const shareUrl = flipbook ? `${appUrl}/flipbook/${flipbook.share_token}` : null;

  const createAction = ensureFlipbook.bind(null, job.id, job.studio_id);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <Link href={`/jobs/${params.id}`} style={{ fontSize: 13, color: '#6b7280' }}>← {job.title}</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Flipbook</h1>
      </div>

      {!flipbook ? (
        /* No flipbook yet */
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 32, textAlign: 'center' }}>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20 }}>
            No flipbook created for this job yet.
          </p>
          <form action={createAction}>
            <button type="submit" style={primaryBtn}>Create flipbook</button>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status card */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
            <h2 style={sectionHeading}>Status</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                {flipbook.published_at ? (
                  <div>
                    <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
                      ● Published
                    </span>
                    <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 10 }}>
                      {new Date(flipbook.published_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                    </span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#9ca3af' }}>
                    ● Unpublished
                  </span>
                )}
              </div>

              {flipbook.storage_path ? (
                flipbook.published_at ? (
                  <form action={unpublishFlipbook.bind(null, flipbook.id, job.id, job.studio_id)}>
                    <button type="submit" style={ghostBtn}>Unpublish</button>
                  </form>
                ) : (
                  <form action={publishFlipbook.bind(null, flipbook.id, job.id, job.studio_id)}>
                    <button type="submit" style={primaryBtn}>Publish</button>
                  </form>
                )
              ) : (
                <span style={{ fontSize: 12, color: '#f59e0b' }}>Upload a PDF first to publish</span>
              )}
            </div>
          </div>

          {/* Share link */}
          {flipbook.published_at && shareUrl && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 20 }}>
              <h2 style={{ ...sectionHeading, color: '#166534' }}>Share link</h2>
              <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                Anyone with this link can view the flipbook — no login required.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <code style={{
                  flex: 1,
                  minWidth: 0,
                  background: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: 4,
                  padding: '6px 10px',
                  fontSize: 13,
                  wordBreak: 'break-all',
                  color: '#0F3D2E',
                }}>
                  {shareUrl}
                </code>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: '#0F3D2E', whiteSpace: 'nowrap' }}
                >
                  Open ↗
                </a>
              </div>

              {flipbook.storage_path?.startsWith('http') && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #bbf7d0' }}>
                  <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                    Direct file link — permanent, opens the PDF straight away with no page around it.
                  </p>
                  <code style={{
                    display: 'block', background: '#fff', border: '1px solid #d1d5db', borderRadius: 4,
                    padding: '6px 10px', fontSize: 12, wordBreak: 'break-all', color: '#0F3D2E',
                  }}>
                    {flipbook.storage_path}
                  </code>
                </div>
              )}
            </div>
          )}

          {/* Upload */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
            <h2 style={sectionHeading}>File</h2>
            {flipbook.storage_path ? (
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                Current file: <code style={{ background: '#f3f4f6', padding: '1px 6px', borderRadius: 3, fontSize: 12 }}>{flipbook.storage_path.split('/').pop()}</code>
              </p>
            ) : (
              <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14 }}>No file uploaded yet.</p>
            )}
            <UploadForm
              flipbookId={flipbook.id}
              jobId={job.id}
              studioId={job.studio_id}
              hasFile={!!flipbook.storage_path}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const sectionHeading: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 14,
};
const primaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 13 };
const ghostBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: 'none', color: '#6b7280', border: '1px solid #d1d5db', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
