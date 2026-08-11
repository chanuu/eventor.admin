'use client';

import { useState } from 'react';

type Client = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export default function ClientEditForm({
  client,
  updateAction,
}: {
  client: Client;
  updateAction: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await updateAction(new FormData(e.currentTarget));
    // server redirects on success; if redirect throws, loading stays true briefly
    setLoading(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <Field label="Full name" required>
        <input name="full_name" required defaultValue={client.full_name} style={inputStyle} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Field label="Email">
          <input name="email" type="email" defaultValue={client.email ?? ''} style={inputStyle} />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={client.phone ?? ''} style={inputStyle} />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={client.notes ?? ''}
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
        />
      </Field>

      <div>
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
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
