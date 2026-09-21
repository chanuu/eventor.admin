import Link from 'next/link';
import { requireCapability, requireFeature } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import StaffTable, { type StaffRowData } from './StaffTable';
import InviteStaffDialog from './InviteStaffDialog';

type StaffRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
  roles: { name: string } | null;
};

type RoleRow = { id: string; name: string; description: string | null; is_system: boolean };

const STAFF_PER_PAGE = 10;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const me = await requireCapability('staff.manage');
  await requireFeature('staff');
  const supabase = createClient();

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const rangeFrom = (page - 1) * STAFF_PER_PAGE;

  const [{ data: listRaw }, { count: total }, { data: rolesRaw }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, full_name, avatar_url, role_id, is_active, created_at, user_id, roles(name)')
      .order('created_at')
      .range(rangeFrom, rangeFrom + STAFF_PER_PAGE - 1),
    supabase.from('staff').select('id', { count: 'exact', head: true }),
    supabase.from('roles').select('id, name, description, is_system').order('name'),
  ]);

  const list = (listRaw ?? []) as unknown as StaffRow[];
  const roles = (rolesRaw ?? []) as RoleRow[];
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / STAFF_PER_PAGE));

  const rows: StaffRowData[] = list.map((s) => ({
    id: s.id,
    full_name: s.full_name,
    avatar_url: s.avatar_url,
    role_id: s.role_id,
    role_name: s.roles?.name ?? null,
    is_active: s.is_active,
    created_at: s.created_at,
    isMe: s.user_id === me.id || s.id === me.id,
  }));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="breadcrumb">
            {total ?? 0} member{(total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex gap-2.5 flex-wrap">
          <Link href="/settings?tab=roles" className="btn-secondary">
            Roles &amp; permissions
          </Link>
          <InviteStaffDialog roles={roles} />
        </div>
      </div>

      <StaffTable rows={rows} roles={roles} />

      <Pagination page={page} totalPages={pageCount} pathname="/staff" />

      {/* Reference panel: what each role can do, and where to change it. */}
      <div className="bg-white rounded-2xl border border-line shadow-card p-6 mt-4">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-extrabold text-primary">Your studio&rsquo;s roles</h2>
          <Link href="/settings?tab=roles" className="text-xs font-bold text-primary">
            Configure →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-3.5">
          {roles.map((r) => (
            <div key={r.id} className="bg-panel border border-line-soft rounded-xl p-3.5">
              <div className="text-sm font-bold text-ink-strong">{r.name}</div>
              <p className="text-xs text-ink-mid mt-1.5 leading-relaxed">
                {r.description ?? 'No description.'}
              </p>
            </div>
          ))}
        </div>

        <p className="text-xs text-ink-muted mt-3.5 leading-relaxed">
          Permissions are enforced by the database as well as the interface, so a hidden page
          cannot be reached by typing its address. At least one active member must always keep
          &ldquo;Manage staff and roles&rdquo;.
        </p>
      </div>
    </div>
  );
}
