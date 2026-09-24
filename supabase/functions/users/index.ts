// Account creation for a frontend with no server.
//
// Creating an auth user, inviting a colleague and removing one all need the
// service role, which must never ship to a browser. This function holds it and
// exposes exactly three operations, each with its own authorisation rule:
//
//   signup  — public. Creates a studio, its owner, and the default roles.
//   invite  — needs staff.manage. Adds a colleague to the caller's studio.
//   remove  — needs staff.manage. Deletes a colleague from the caller's studio.
//
// Deploy: supabase functions deploy users --no-verify-jwt
//         (signup must be reachable without a session; the other two check the
//          caller themselves.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Plan a brand-new studio starts on. Must match a key in `plans`. */
const DEFAULT_PLAN_KEY = 'solo';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/** Resolves the caller from their own token, so RLS decides what they can see. */
async function callerStaff(authHeader: string) {
  const asUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await asUser.auth.getUser();
  if (!auth.user) return null;

  const { data } = await asUser
    .from('staff')
    .select('id, studio_id, roles(role_permissions(permission_key))')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;
  const row = data as any;

  return {
    id: row.id as string,
    studio_id: row.studio_id as string,
    permissions: (row.roles?.role_permissions ?? []).map(
      (p: { permission_key: string }) => p.permission_key,
    ) as string[],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  switch (body.action) {
    case 'signup':
      return signup(body);
    case 'invite':
      return invite(req, body);
    case 'remove':
      return remove(req, body);
    default:
      return json({ error: 'Unknown action.' }, 400);
  }
});

// ─── Signup ─────────────────────────────────────────────────────────────────

async function signup(body: any) {
  const studioName = String(body.studioName ?? '').trim();
  const fullName = String(body.fullName ?? '').trim();
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');

  if (!studioName || !fullName || !email || password.length < 8) {
    return json({ error: 'All fields are required, with a password of at least 8 characters.' }, 400);
  }

  const db = admin();

  const { data: created, error: userError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (userError || !created.user) {
    return json({ error: userError?.message ?? 'Could not create the account.' }, 400);
  }
  const userId = created.user.id;

  /** Signup is multi-step; if a later step fails, undo the earlier ones. */
  const rollback = async (studioId?: string) => {
    if (studioId) await db.from('studios').delete().eq('id', studioId);
    await db.auth.admin.deleteUser(userId);
  };

  const slug =
    studioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) ||
    `studio-${userId.slice(0, 8)}`;

  // Inserting the studio fires the trigger that seeds its default roles.
  const { data: studioRaw, error: studioError } = await db
    .from('studios')
    .insert({ name: studioName, slug: `${slug}-${userId.slice(0, 4)}` })
    .select('id')
    .single();

  if (studioError || !studioRaw) {
    await rollback();
    return json({ error: studioError?.message ?? 'Could not create the studio.' }, 400);
  }
  const studioId = (studioRaw as { id: string }).id;

  const { data: adminRole } = await db
    .from('roles')
    .select('id')
    .eq('studio_id', studioId)
    .eq('key', 'admin')
    .maybeSingle();

  if (!adminRole) {
    await rollback(studioId);
    return json({ error: 'Could not set up studio roles. Please try again.' }, 400);
  }

  const { error: staffError } = await db.from('staff').insert({
    studio_id: studioId,
    user_id: userId,
    full_name: fullName,
    role: 'admin',
    role_id: (adminRole as { id: string }).id,
    is_active: true,
  });

  if (staffError) {
    await rollback(studioId);
    return json({ error: staffError.message }, 400);
  }

  // plan_key is what matters: has_feature() joins plan_features on it, so a
  // NULL leaves the studio with no features and the whole app looks broken.
  const { error: subError } = await db.from('subscriptions').insert({
    studio_id: studioId,
    plan_key: DEFAULT_PLAN_KEY,
    plan: 'basic',
    status: 'active',
  });

  if (subError) {
    await rollback(studioId);
    return json({ error: 'Could not set up your plan. Please try again.' }, 400);
  }

  return json({ ok: true, studioId });
}

// ─── Invite ─────────────────────────────────────────────────────────────────

async function invite(req: Request, body: any) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = await callerStaff(authHeader);
  if (!caller) return json({ error: 'Unauthorized.' }, 401);
  if (!caller.permissions.includes('staff.manage')) {
    return json({ error: 'You cannot manage staff.' }, 403);
  }

  const email = String(body.email ?? '').trim();
  const fullName = String(body.fullName ?? '').trim();
  const roleId = String(body.roleId ?? '');
  if (!email || !fullName || !roleId) return json({ error: 'All fields are required.' }, 400);

  const db = admin();

  // The role must belong to the caller's studio — never take it on trust.
  const { data: role } = await db
    .from('roles')
    .select('id')
    .eq('id', roleId)
    .eq('studio_id', caller.studio_id)
    .maybeSingle();
  if (!role) return json({ error: 'Role not found.' }, 404);

  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (inviteError || !invited.user) {
    return json({ error: inviteError?.message ?? 'Could not send the invite.' }, 400);
  }

  const { error: staffError } = await db.from('staff').insert({
    studio_id: caller.studio_id,
    user_id: invited.user.id,
    full_name: fullName,
    role: 'editor',
    role_id: roleId,
    is_active: true,
  });

  if (staffError) {
    await db.auth.admin.deleteUser(invited.user.id);
    return json({ error: staffError.message }, 400);
  }

  return json({ ok: true });
}

// ─── Remove ─────────────────────────────────────────────────────────────────

async function remove(req: Request, body: any) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = await callerStaff(authHeader);
  if (!caller) return json({ error: 'Unauthorized.' }, 401);
  if (!caller.permissions.includes('staff.manage')) {
    return json({ error: 'You cannot manage staff.' }, 403);
  }

  const staffId = String(body.staffId ?? '');
  if (!staffId) return json({ error: 'Which member?' }, 400);
  if (staffId === caller.id) return json({ error: 'You cannot remove yourself.' }, 400);

  const db = admin();

  const { data: target } = await db
    .from('staff')
    .select('id, user_id')
    .eq('id', staffId)
    .eq('studio_id', caller.studio_id)
    .maybeSingle();

  if (!target) return json({ error: 'Staff member not found.' }, 404);

  await db.from('staff').delete().eq('id', staffId);
  await db.auth.admin.deleteUser((target as { user_id: string }).user_id);

  return json({ ok: true });
}
