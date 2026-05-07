'use client';

import { useRef, useState } from 'react';
import { uploadStudioLogo } from './actions';

export default function LogoUploadForm({ studioId, hasLogo }: { studioId: string; hasLogo: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const result = await uploadStudioLogo(studioId, new FormData(e.currentTarget));
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
          {hasLogo ? 'Replace logo' : 'Upload logo'} <span style={{ color: '#ef4444' }}>*</span>
        </label>
        <input ref={inputRef} name="logo" type="file" accept="image/*" required style={{ fontSize: 13, color: '#374151' }} />
        <p style={{ fontSize: 12, color: '#9ca3af' }}>PNG, JPG, or SVG — max 2 MB. Used on contracts.</p>
      </div>

      {error   && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
      {success && <p style={{ fontSize: 13, color: '#16a34a' }}>Logo uploaded. Refresh to see it.</p>}

      <div>
        <button
          type="submit"
          disabled={loading}
          style={{ height: 34, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 13 }}
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
