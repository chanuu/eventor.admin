import { requireCapability } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import InviteForm from './InviteForm';

type RoleRow = { id: string; name: string; description: string | null };

export default async function InviteStaffPage() {
  await requireCapability('staff.manage');

  const supabase = createClient();
  const { data } = await supabase
    .from('roles')
    .select('id, name, description')
    .order('is_system', { ascending: false })
    .order('name');

  return <InviteForm roles={(data ?? []) as RoleRow[]} />;
}
