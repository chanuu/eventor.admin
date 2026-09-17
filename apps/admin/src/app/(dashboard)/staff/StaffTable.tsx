'use client';

import DataTable, { type Column } from '@/components/DataTable';
import RoleSelect from './RoleSelect';
import Avatar from '@/components/Avatar';
import { toggleStaffActive } from './invite/actions';

export type StaffRowData = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_id: string | null;
  role_name: string | null;
  is_active: boolean;
  created_at: string;
  /** True for the signed-in member, who cannot change their own role or status. */
  isMe: boolean;
};

type Role = { id: string; name: string; description: string | null; is_system: boolean };

function buildColumns(roles: Role[]): Column<StaffRowData>[] {
  return [
    {
      key: 'name',
      label: 'Name',
      primary: true,
      render: (s) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={s.full_name} url={s.avatar_url} size={40} />
          <div className="min-w-0">
            <p className="font-medium text-gray-900 truncate">{s.full_name}</p>
            {s.isMe && <p className="text-xs text-gray-400 mt-0.5">you</p>}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      width: '210px',
      render: (s) =>
        s.isMe ? (
          <span className="pill-good">{s.role_name ?? 'No role'}</span>
        ) : (
          <RoleSelect staffId={s.id} roleId={s.role_id} roles={roles} />
        ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '110px',
      render: (s) => (
        <span className={s.is_active ? 'text-green-600' : 'text-gray-400'}>
          {s.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'joined',
      label: 'Joined',
      width: '130px',
      render: (s) => (
        <span className="text-gray-500 whitespace-nowrap">
          {new Date(s.created_at).toLocaleDateString('en-GB')}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: '140px',
      align: 'right',
      render: (s) =>
        s.isMe ? (
          <span className="text-gray-300 text-[13px]">—</span>
        ) : (
          <form action={toggleStaffActive.bind(null, s.id, !s.is_active)} className="flex justify-end">
            <button type="submit" className="btn-secondary text-[12px] h-8 px-3">
              {s.is_active ? 'Deactivate' : 'Activate'}
            </button>
          </form>
        ),
    },
  ];
}

/**
 * Rows are not click-through: each carries a role dropdown and an activate form,
 * and DataTable renders a clickable row as an anchor on mobile — nesting either
 * inside an anchor is invalid markup.
 */
export default function StaffTable({ rows, roles }: { rows: StaffRowData[]; roles: Role[] }) {
  return (
    <DataTable
      columns={buildColumns(roles)}
      rows={rows}
      emptyMessage="No staff yet. Invite the people you work with and give each of them a role."
    />
  );
}
