'use server';

import { revalidatePath } from 'next/cache';
import type { StaffRole } from '@eventor/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function inviteStaffMember(formData: FormData) {
  const fullName = (formData.get('full_name') as string).trim();
  const email    = (formData.get('email') as string).trim();
  const role     = (formData.get('role') as StaffRole);

  // Verify caller is an active admin
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized.' };

  const { data: callerRaw } = await supabase
    .from('staff')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .single();
  const caller = callerRaw as { studio_id: string; role: StaffRole } | null;
  if (!caller || caller.role !== 'admin') return { error: 'Only admins can invite staff.' };

  const admin = createAdminClient();

  // Send Supabase invite email — returns user with id immediately
  const { data: { user: invited }, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { full_name: fullName },
  });
  if (inviteErr || !invited) return { error: inviteErr?.message ?? 'Failed to send invite.' };

  // Create staff record linked to the invited user id
  const { error: staffErr } = await admin.from('staff').insert({
    studio_id: caller.studio_id,
    user_id:   invited.id,
    role,
    full_name: fullName,
  });
  if (staffErr) return { error: staffErr.message };

  revalidatePath('/staff');
  return { success: true };
}

export async function toggleStaffActive(staffId: string, isActive: boolean): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('staff').update({ is_active: isActive }).eq('id', staffId);
  revalidatePath('/staff');
}
