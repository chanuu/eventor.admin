'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uploadAlbumMusic } from './actions';

export default function MusicUploader({ albumId, jobId, studioId, hasTrack }: {
  albumId: string; jobId: string; studioId: string; hasTrack: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await uploadAlbumMusic(albumId, jobId, studioId, new FormData(e.currentTarget));
    setLoading(false);

    if (result.error) { setError(result.error); return; }
    if (inputRef.current) inputRef.current.value = '';
    setFileName('');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        ref={inputRef}
        name="music"
        type="file"
        accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav"
        required
        onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
        style={{ fontSize: 13, color: '#5b6660' }}
      />
      <p style={{ fontSize: 12, color: '#8b968f', margin: 0 }}>
        MP3, M4A, AAC, OGG or WAV, up to 12 MB. It loops quietly while the client reads.
        {fileName && <span style={{ color: '#0F3D2E', marginLeft: 8, fontWeight: 600 }}>{fileName}</span>}
      </p>
      {error && <p style={{ fontSize: 12.5, color: '#dc2626', margin: 0 }}>{error}</p>}
      <div>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: 34, borderRadius: 9, background: loading ? '#A8BDB2' : '#0F3D2E', color: '#fff',
            border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            padding: '0 16px', fontSize: 12.5,
          }}
        >
          {loading ? 'Uploading…' : hasTrack ? 'Replace track' : 'Upload track'}
        </button>
      </div>
    </form>
  );
}
