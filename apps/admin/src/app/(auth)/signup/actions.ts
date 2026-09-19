'use server';

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function createStudioAndAdmin(formData: FormData) {
  const fullName   = (formData.get('full_name') as string).trim();
  const email      = (formData.get('email') as string).trim();
  const password   = (formData.get('password') as string);
  const studioName = (formData.get('studio_name') as string).trim();
  const rawSlug    = (formData.get('slug') as string).trim();
  const slug       = rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (!slug) return { error: 'Slug is required.' };

  const admin = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await admin.from('studios').select('id').eq('slug', slug).maybeSingle();
  if (existing) return { error: 'That studio URL is already taken.' };

  // 1. Create auth user (email_confirm bypassed — admin creates)
  const { data: { user }, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (userErr || !user) return { error: userErr?.message ?? 'Could not create user.' };

  // 2. Create studio
  const { data: studio, error: studioErr } = await admin
    .from('studios')
    .insert({ name: studioName, slug })
    .select('id')
    .single();

  if (studioErr || !studio) {
    await admin.auth.admin.deleteUser(user.id);
    return { error: studioErr?.message ?? 'Could not create studio.' };
  }

  // 3. Link to the studio's Admin role.
  //
  // Inserting the studio fires a trigger that seeds its four default roles;
  // without role_id the new owner would have no permissions and be locked out
  // of the studio they just created.
  const { data: adminRole } = await admin
    .from('roles')
    .select('id')
    .eq('studio_id', studio.id)
    .eq('key', 'admin')
    .maybeSingle();

  if (!adminRole) {
    await admin.auth.admin.deleteUser(user.id);
    await admin.from('studios').delete().eq('id', studio.id);
    return { error: 'Could not set up studio roles. Please try again.' };
  }

  const { error: staffErr } = await admin.from('staff').insert({
    studio_id: studio.id,
    user_id: user.id,
    role: 'admin',
    role_id: (adminRole as { id: string }).id,
    full_name: fullName,
  });

  if (staffErr) {
    await admin.auth.admin.deleteUser(user.id);
    await admin.from('studios').delete().eq('id', studio.id);
    return { error: staffErr.message };
  }

  // 4. Create default subscription (basic, active)
  await admin.from('subscriptions').insert({ studio_id: studio.id, plan: 'basic', status: 'active' });

  // 5. Sign in with the regular client so session cookies are set
  const supabase = createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) return { error: 'Account created — please sign in.' };

  redirect('/dashboard');
}
