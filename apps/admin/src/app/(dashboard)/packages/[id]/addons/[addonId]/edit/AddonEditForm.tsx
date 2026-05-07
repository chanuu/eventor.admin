'use client';

import { useState } from 'react';

type Addon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

export default function AddonEditForm({
  addon,
  updateAction,
}: {
  addon: Addon;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateAction(new FormData(e.currentTarget));
    } catch {
      setError('Failed to save changes.');
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <Field label="Name" required>
        <input name="name" required defaultValue={addon.name} style={inputStyle} />
      </Field>

      <Field label="Description">
        <input name="description" defaultValue={addon.description ?? ''} style={inputStyle} placeholder="Optional description" />
      </Field>

      <Field label="Price (LKR)" required>
        <input name="price" type="number" min="0" step="500" required defaultValue={addon.price} style={inputStyle} />
      </Field>

      {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={loading} style={primaryBtn}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
