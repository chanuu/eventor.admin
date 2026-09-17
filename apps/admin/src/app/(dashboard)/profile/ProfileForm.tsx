'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from './actions';

export default function ProfileForm({ fullName }: { fullName: string }) {
  const [name, setName] = useState(fullName);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const dirty = name.trim() !== fullName;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const result = await updateProfile(new FormData(e.currentTarget));
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-[13px] font-medium text-ink-strong">
          Display name <span className="text-red-500">*</span>
        </label>
        <input
          id="full_name"
          name="full_name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className="input"
        />
        <p className="text-[11.5px] text-ink-muted">
          Shown on task cards, in comments and to your colleagues.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving || !dirty} className="btn-primary disabled:opacity-50">
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {saved && !dirty && (
          <span className="text-[12.5px] text-green-700 font-semibold">Saved.</span>
        )}
      </div>
    </form>
  );
}
