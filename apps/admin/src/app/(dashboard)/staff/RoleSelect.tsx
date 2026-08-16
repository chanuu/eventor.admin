'use client';

import { useState, useTransition } from 'react';
import { updateStaffRole } from './invite/actions';

/** Changing the select applies immediately — no separate save step. */
export default function RoleSelect({ staffId, roleId, roles }: {
  staffId: string;
  roleId: string | null;
  roles: { id: string; name: string }[];
}) {
  const [value, setValue] = useState(roleId ?? '');
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(() => { updateStaffRole(staffId, next); });
      }}
      style={{
        height: 30, borderRadius: 8, border: '1px solid #D8E0DC', padding: '0 8px',
        fontSize: 12.5, fontWeight: 600, color: '#123528', background: '#fff',
        cursor: pending ? 'wait' : 'pointer',
      }}
    >
      {!roleId && <option value="">— No role —</option>}
      {roles.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}
