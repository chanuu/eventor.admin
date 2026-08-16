'use client';

import { useState } from 'react';
import type { PermissionRow } from '@/lib/permissions';
import { updateRole } from '../actions';

export default function RoleForm({ roleId, name, description, permissions, granted }: {
  roleId: string;
  name: string;
  description: string;
  permissions: PermissionRow[];
  granted: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(granted));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Group by the catalogue's category so the list reads as sections.
  const categories = permissions.reduce<Record<string, PermissionRow[]>>((acc, p) => {
    (acc[p.category] ??= []).push(p);
    return acc;
  }, {});

  function toggle(key: string) {
    setError('');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const result = await updateRole(roleId, new FormData(e.currentTarget));
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form onSubmit={handleSubmit} style={card}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Role name</label>
          <input name="name" defaultValue={name} required style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={labelStyle}>Description</label>
          <input name="description" defaultValue={description} style={inputStyle} />
        </div>
      </div>

      <div style={{ height: 1, background: '#EDEFEC', margin: '20px 0' }} />

      <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F3D2E', marginBottom: 4 }}>Permissions</h2>
      <p style={{ fontSize: 12.5, color: '#8b968f', margin: '0 0 16px' }}>
        {selected.size} selected. These are enforced by the database, not just the interface.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {Object.entries(categories).map(([category, list]) => (
          <div key={category}>
            <div style={categoryLabel}>{category}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8, marginTop: 8 }}>
              {list.map((p) => {
                const on = selected.has(p.key);
                return (
                  <label key={p.key} style={permRow(on)}>
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.key}
                      checked={on}
                      onChange={() => toggle(p.key)}
                      style={{ width: 16, height: 16, accentColor: '#8BC53F', flexShrink: 0 }}
                    />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#123528' }}>
                        {p.label}
                      </span>
                      <span style={{ display: 'block', fontSize: 11, color: '#8b968f', marginTop: 1 }}>
                        {p.key}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p style={{ fontSize: 12.5, color: '#dc2626', marginTop: 16, lineHeight: 1.5 }}>{error}</p>
      )}

      <div style={{ marginTop: 20 }}>
        <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save role'}
        </button>
      </div>
    </form>
  );
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 24,
};
const labelStyle: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#123528' };
const inputStyle: React.CSSProperties = {
  height: 38, borderRadius: 9, border: '1px solid #D8E0DC', padding: '0 12px', fontSize: 13.5, width: '100%',
};
const categoryLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#8b968f', textTransform: 'uppercase', letterSpacing: 1,
};
function permRow(on: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 10, cursor: 'pointer',
    background: on ? '#F1F6EC' : '#FAFBF9',
    border: `1px solid ${on ? '#DCE9CE' : '#EDEFEC'}`,
  };
}
const primaryBtn: React.CSSProperties = {
  height: 38, borderRadius: 9, background: '#0F3D2E', color: '#fff', border: 'none',
  fontWeight: 700, cursor: 'pointer', padding: '0 20px', fontSize: 12.5,
};
