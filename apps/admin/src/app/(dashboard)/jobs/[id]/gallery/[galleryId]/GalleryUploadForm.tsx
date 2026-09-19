'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUploadTickets, recordUploadedPhotos } from '../actions';
import { makeDerivatives, mapWithConcurrency } from '@/lib/image-client';

/**
 * Photos go straight from the browser to S3 using presigned URLs.
 *
 * They used to be posted to a server action, which meant a 1000-photo proofing
 * set arrived as one multi-gigabyte request and was processed one file at a
 * time — well past both the request size and function time limits. Here the
 * server only issues tickets and records the results.
 */

/** Photos per round trip. Small enough that a failure loses little work. */
const CHUNK_SIZE = 40;
/** Parallel uploads. Enough to saturate a connection, not enough to choke it. */
const UPLOAD_CONCURRENCY = 4;
/** Parallel compressions. CPU-bound, so keep it near the core count. */
const ENCODE_CONCURRENCY = 3;
/** Largest original accepted, before compression. */
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

async function putToS3(url: string, blob: Blob, attempt = 0): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'PUT',
      body: blob,
      // These must match the headers the URL was signed with, or S3 rejects it.
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    if (!res.ok) throw new Error(`S3 responded ${res.status}`);
  } catch (err) {
    // A dropped connection midway through a long upload is normal; retry twice.
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      return putToS3(url, blob, attempt + 1);
    }
    throw err;
  }
}

export default function GalleryUploadForm({
  galleryId,
  jobId,
  studioId,
}: {
  galleryId: string;
  jobId: string;
  studioId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [skipped, setSkipped] = useState<string[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [done, setDone] = useState(0);
  const [stage, setStage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const picked = Array.from(inputRef.current?.files ?? []).filter((f) => f.size > 0);
    if (!picked.length) {
      setError('Please select at least one image.');
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    setSkipped([]);
    setDone(0);

    const problems: string[] = [];
    let recorded = 0;

    try {
      for (let start = 0; start < picked.length; start += CHUNK_SIZE) {
        const chunk = picked.slice(start, start + CHUNK_SIZE);

        // 1. Resize in the browser, so only the compressed bytes travel.
        setStage('Preparing');
        const derived = (
          await mapWithConcurrency(chunk, ENCODE_CONCURRENCY, async (file) => {
            if (file.type && !file.type.startsWith('image/')) {
              problems.push(`${file.name} is not an image`);
              return null;
            }
            if (file.size > MAX_UPLOAD_BYTES) {
              problems.push(`${file.name} is over 40 MB`);
              return null;
            }
            try {
              const d = await makeDerivatives(file);
              return { name: file.name, full: d.full, thumb: d.thumb };
            } catch (err) {
              problems.push(`${file.name} ${err instanceof Error ? err.message : 'failed'}`);
              return null;
            }
          })
        ).filter(Boolean) as { name: string; full: Blob; thumb: Blob }[];

        if (!derived.length) continue;

        // 2. One presign call for the whole chunk.
        const ticketResult = await createUploadTickets(galleryId, jobId, studioId, derived.length);
        if (ticketResult.error || ticketResult.tickets.length !== derived.length) {
          setError(ticketResult.error || 'Could not prepare the upload.');
          break;
        }

        // 3. Straight to S3, several at a time.
        setStage('Uploading');
        const uploads = await mapWithConcurrency(derived, UPLOAD_CONCURRENCY, async (d, i) => {
          const ticket = ticketResult.tickets[i];
          try {
            await Promise.all([
              putToS3(ticket.fullUploadUrl, d.full),
              putToS3(ticket.thumbUploadUrl, d.thumb),
            ]);
            setDone((n) => n + 1);
            return { url: ticket.fullPublicUrl, thumbUrl: ticket.thumbPublicUrl, fileName: d.name };
          } catch (err) {
            problems.push(`${d.name} could not be uploaded`);
            return null;
          }
        });

        const uploaded = uploads.filter(Boolean) as {
          url: string;
          thumbUrl: string;
          fileName: string;
        }[];
        if (!uploaded.length) continue;

        // 4. Record this chunk before starting the next, so a later failure
        //    never discards work that already succeeded.
        setStage('Saving');
        const recordResult = await recordUploadedPhotos(galleryId, jobId, studioId, uploaded);
        if (recordResult.error) {
          setError(recordResult.error);
          break;
        }
        recorded += recordResult.recorded;
      }

      if (recorded > 0) {
        setMessage(`${recorded} photo${recorded !== 1 ? 's' : ''} uploaded successfully.`);
        if (inputRef.current) inputRef.current.value = '';
        setFileCount(0);
        router.refresh();
      } else if (!problems.length) {
        setError((prev) => prev || 'No images could be processed.');
      }
      setSkipped(problems);
    } catch (err) {
      console.error('[GalleryUploadForm]', err);
      setError(err instanceof Error ? err.message : 'Something went wrong during the upload.');
    } finally {
      setBusy(false);
      setStage('');
    }
  }

  const pct = fileCount > 0 ? Math.round((done / fileCount) * 100) : 0;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          Images <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          ref={inputRef}
          name="files"
          type="file"
          accept="image/*"
          multiple
          required
          disabled={busy}
          onChange={(e) => {
            setFileCount(e.target.files?.length ?? 0);
            setError('');
            setMessage('');
            setSkipped([]);
          }}
          style={{ fontSize: 13, color: '#374151' }}
        />
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
          JPEG, PNG, or WebP, up to 40 MB each — resized in your browser before upload, so
          large sets go quickly. Hold Ctrl / Cmd to select multiple files.
          {fileCount > 0 && (
            <span style={{ color: '#0F3D2E', marginLeft: 8, fontWeight: 500 }}>
              {fileCount} file{fileCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </p>
      </div>

      {busy && fileCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
            <div
              style={{
                width: `${pct}%`,
                height: '100%',
                background: '#0F3D2E',
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
            {stage} — {done} of {fileCount}
          </span>
        </div>
      )}

      {error && <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>}
      {message && <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>{message}</p>}

      {skipped.length > 0 && (
        <div style={{ fontSize: 12, color: '#b45309' }}>
          <p style={{ margin: '0 0 4px' }}>{skipped.length} skipped:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {skipped.slice(0, 8).map((s) => (
              <li key={s}>{s}</li>
            ))}
            {skipped.length > 8 && <li>and {skipped.length - 8} more</li>}
          </ul>
        </div>
      )}

      <div>
        <button
          type="submit"
          disabled={busy}
          style={{
            height: 34,
            borderRadius: 6,
            background: busy ? '#A8BDB2' : '#0F3D2E',
            color: '#fff',
            border: 'none',
            fontWeight: 500,
            cursor: busy ? 'not-allowed' : 'pointer',
            padding: '0 18px',
            fontSize: 13,
          }}
        >
          {busy ? `${stage || 'Working'}…` : 'Upload Photos'}
        </button>
      </div>
    </form>
  );
}
