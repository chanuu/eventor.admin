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
    <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
      <Field label="Full name" required>
        <input name="full_name" required defaultValue={client.full_name} className="input" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Email">
          <input name="email" type="email" defaultValue={client.email ?? ''} className="input" />
        </Field>
        <Field label="Phone">
          <input name="phone" defaultValue={client.phone ?? ''} className="input" />
        </Field>
      </div>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={3}
          defaultValue={client.notes ?? ''}
          className="input h-auto py-2 resize-y"
        />
      </Field>

      <div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">
        {label}
        {required && <span className="form-req"> *</span>}
      </label>
      {children}
    </div>
  );
}
