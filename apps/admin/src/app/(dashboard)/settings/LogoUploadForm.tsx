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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          {hasLogo ? 'Replace logo' : 'Upload logo'} <span className="text-red-500">*</span>
        </label>
        <input ref={inputRef} name="logo" type="file" accept="image/*" required className="text-sm text-gray-600" />
        <p className="text-xs text-gray-400">PNG, JPG, or SVG — max 2 MB. Used on contracts.</p>
      </div>

      {error   && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Logo uploaded. Refresh to see it.</p>}

      <div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}
