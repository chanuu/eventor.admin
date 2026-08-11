'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAlbumPages } from './actions';

export default function AlbumPageUploader({ albumId, jobId, studioId }: {
  albumId: string; jobId: string; studioId: string;
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

    const result = await uploadAlbumPages(albumId, jobId, studioId, new FormData(e.currentTarget));

    if (result.error) setError(result.error);
    if (result.uploaded > 0) {
      const n = result.uploaded;
      setMessage(`${n} page${n !== 1 ? 's' : ''} added.`);
      if (inputRef.current) inputRef.current.value = '';
      setFileCount(0);
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12.5, fontWeight: 600, color: '#123528' }}>Upload album pages</label>
        <input
          ref={inputRef}
          name="files"
          type="file"
          accept="image/*"
          multiple
          required
          onChange={(e) => setFileCount(e.target.files?.length ?? 0)}
          style={{ fontSize: 13, color: '#5b6660' }}
        />
        <p style={{ fontSize: 12, color: '#8b968f', margin: 0 }}>
          Finished spreads exported as JPEG or PNG. Each is resized to fit under 2 MB.
          {fileCount > 0 && (
            <span style={{ color: '#0F3D2E', marginLeft: 8, fontWeight: 600 }}>
              {fileCount} file{fileCount !== 1 ? 's' : ''} selected
            </span>
          )}
        </p>
      </div>

      {error && <p style={{ fontSize: 12.5, color: '#dc2626', margin: 0 }}>{error}</p>}
      {message && <p style={{ fontSize: 12.5, color: '#16a34a', margin: 0 }}>{message}</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: 36, borderRadius: 9, background: loading ? '#A8BDB2' : '#0F3D2E', color: '#fff',
            border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            padding: '0 18px', fontSize: 12.5,
          }}
        >
          {loading ? 'Uploading…' : 'Add pages'}
        </button>
      </div>
    </form>
  );
}
