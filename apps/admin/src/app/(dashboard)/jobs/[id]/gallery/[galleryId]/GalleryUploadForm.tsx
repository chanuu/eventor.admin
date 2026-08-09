'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadPhotos } from '../actions';

export default function GalleryUploadForm({
  galleryId,
  jobId,
  studioId,
}: {
  galleryId: string;
  jobId: string;
  studioId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fileCount, setFileCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const result = await uploadPhotos(galleryId, jobId, studioId, new FormData(e.currentTarget));

    if (result.error) {
      setError(result.error);
    } else {
      const n = result.uploaded;
      setMessage(`${n} photo${n !== 1 ? 's' : ''} uploaded successfully.`);
      if (inputRef.current) inputRef.current.value = '';
      setFileCount(0);
      router.refresh();
    }
    setLoading(false);
  }

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
          onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
          style={{ fontSize: 13, color: '#374151' }}
        />
        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
          JPEG, PNG, or WebP. Hold Ctrl / Cmd to select multiple files.
          {fileCount > 0 && (
            <span style={{ color: '#2563eb', marginLeft: 8, fontWeight: 500 }}>
              {fileCount} file{fileCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </p>
      </div>

      {error   && <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>}
      {message && <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>{message}</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: 34, borderRadius: 6,
            background: loading ? '#93c5fd' : '#2563eb',
            color: '#fff', border: 'none',
            fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
            padding: '0 18px', fontSize: 13,
          }}
        >
          {loading
            ? `Uploading${fileCount > 0 ? ` ${fileCount} file${fileCount !== 1 ? 's' : ''}` : ''}…`
            : 'Upload Photos'}
        </button>
      </div>
    </form>
  );
}
