'use client';

import { useRef, useState } from 'react';
import { uploadFlipbook } from './actions';

export default function UploadForm({
  flipbookId,
  jobId,
  studioId,
  hasFile,
}: {
  flipbookId: string;
  jobId: string;
  studioId: string;
  hasFile: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const result = await uploadFlipbook(flipbookId, jobId, studioId, new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      if (inputRef.current) inputRef.current.value = '';
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>
          {hasFile ? 'Replace PDF' : 'Upload PDF'} <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input
          ref={inputRef}
          name="file"
          type="file"
          accept=".pdf"
          required
          style={{ fontSize: 13, color: '#374151' }}
        />
        <p style={{ fontSize: 12, color: '#9ca3af' }}>PDF format only. Will replace any existing file.</p>
      </div>

      {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
      {success && <p style={{ fontSize: 13, color: '#16a34a' }}>File uploaded successfully.</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          style={{
            height: 34,
            borderRadius: 6,
            background: '#0F3D2E',
            color: '#fff',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0 18px',
            fontSize: 13,
          }}
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
