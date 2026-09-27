// Presigned S3 URLs for the browser.
//
// The React admin has no server, so nothing there can hold the S3 keys. This
// function is the only thing that does: it checks who is asking, confirms they
// own the thing they are uploading to, and hands back a short-lived PUT URL.
// File bytes never pass through here — the browser talks to S3 directly, which
// is what lets a 1000-photo set upload without touching our infrastructure.
//
// Deploy:  supabase functions deploy storage
// Secrets: supabase secrets set S3_REGION=... S3_BUCKET=... \
//            S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const REGION = Deno.env.get('S3_REGION') ?? '';
const BUCKET = Deno.env.get('S3_BUCKET') ?? '';
const ACCESS_KEY = Deno.env.get('S3_ACCESS_KEY_ID') ?? '';
const SECRET_KEY = Deno.env.get('S3_SECRET_ACCESS_KEY') ?? '';
const PUBLIC_BASE = (Deno.env.get('S3_PUBLIC_URL') ?? '').replace(/\/$/, '');

/** Photos per request. Matches the admin app's MAX_BATCH. */
const MAX_ITEMS = 200;
const EXPIRY_SECONDS = 900;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * A bucket name containing a dot breaks the wildcard TLS certificate on
 * virtual-hosted-style URLs, so those are addressed by path instead. The public
 * URL and the signed URL must agree, or the object uploads somewhere the app
 * cannot read it back from.
 */
const pathStyle = BUCKET.includes('.');

function objectUrl(key: string): string {
  const encoded = key.split('/').map(encodeURIComponent).join('/');
  const base = pathStyle
    ? `https://s3.${REGION}.amazonaws.com/${BUCKET}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
  return `${base}/${encoded}`;
}

function publicUrl(key: string): string {
  if (!PUBLIC_BASE) return objectUrl(key);
  return `${PUBLIC_BASE}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

type Kind = 'gallery' | 'album' | 'album-music' | 'avatar' | 'flipbook';

type Item = { kind: Kind; parentId: string; ext?: string; contentType?: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);

  if (!REGION || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
    return json({ error: 'Storage is not configured. Set the S3_* secrets.' }, 500);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'Unauthorized.' }, 401);

  // Forward the caller's token so every query below runs under their RLS, not
  // ours. Never trust a studio_id from the body — derive it from the session.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return json({ error: 'Unauthorized.' }, 401);

  const { data: staffRow } = await supabase
    .from('staff')
    .select('id, studio_id')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!staffRow) return json({ error: 'No active staff record.' }, 403);
  const staff = staffRow as { id: string; studio_id: string };

  let body: { items?: Item[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }

  const items = body.items ?? [];
  if (!items.length) return json({ error: 'Nothing to upload.' }, 400);
  if (items.length > MAX_ITEMS) {
    return json({ error: `At most ${MAX_ITEMS} items per request.` }, 400);
  }

  // Confirm ownership once per distinct parent rather than per item.
  const seen = new Map<string, boolean>();
  for (const item of items) {
    const cacheKey = `${item.kind}:${item.parentId}`;
    if (seen.has(cacheKey)) {
      if (!seen.get(cacheKey)) return json({ error: 'Not found.' }, 404);
      continue;
    }

    const ok = await ownsParent(supabase, staff, item);
    seen.set(cacheKey, ok);
    if (!ok) return json({ error: 'Not found.' }, 404);
  }

  const aws = new AwsClient({
    accessKeyId: ACCESS_KEY,
    secretAccessKey: SECRET_KEY,
    service: 's3',
    region: REGION,
  });

  const tickets = await Promise.all(
    items.map(async (item) => {
      const ext = (item.ext ?? 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
      const contentType = item.contentType ?? 'image/jpeg';
      const key = keyFor(item, staff.studio_id, crypto.randomUUID(), ext);

      // These headers are signed, so the browser must send them verbatim.
      const signed = await aws.sign(
        new Request(objectUrl(key), {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        }),
        { aws: { signQuery: true, allHeaders: true }, expiresIn: EXPIRY_SECONDS },
      );

      return { uploadUrl: signed.url, publicUrl: publicUrl(key), key, contentType };
    }),
  );

  return json({ tickets });
});

/** Where each kind of object lives, mirroring the admin app's key layout. */
function keyFor(item: Item, studioId: string, id: string, ext: string): string {
  switch (item.kind) {
    case 'gallery':
      return `galleries/${studioId}/${item.parentId}/${id}.${ext}`;
    case 'album':
      return `albums/${studioId}/${item.parentId}/${id}.${ext}`;
    case 'album-music':
      return `albums/${studioId}/${item.parentId}/music/${id}.${ext}`;
    case 'avatar':
      return `avatars/${studioId}/${item.parentId}/${id}.${ext}`;
    case 'flipbook':
      // Nested under albums/ so it inherits the existing public-read grant.
      return `albums/flipbooks/${studioId}/${item.parentId}/${id}.${ext}`;
  }
}

/**
 * Proves the caller owns the gallery / album / staff row they are uploading
 * against. Reads go through their own client, so RLS does the checking — but
 * studio_id is matched explicitly too, because the public read policies expose
 * shared albums to everyone and readability is not ownership.
 */
async function ownsParent(
  supabase: ReturnType<typeof createClient>,
  staff: { id: string; studio_id: string },
  item: Item,
): Promise<boolean> {
  if (item.kind === 'avatar') {
    // Your own picture always; anyone else's needs staff.manage, which RLS
    // enforces on the update that follows.
    if (item.parentId === staff.id) return true;
    const { data } = await supabase
      .from('staff')
      .select('id')
      .eq('id', item.parentId)
      .eq('studio_id', staff.studio_id)
      .maybeSingle();
    return !!data;
  }

  if (item.kind === 'flipbook') {
    const { data } = await supabase
      .from('flipbooks')
      .select('id')
      .eq('id', item.parentId)
      .eq('studio_id', staff.studio_id)
      .maybeSingle();
    return !!data;
  }

  if (item.kind === 'gallery') {
    // galleries carries no studio_id of its own, so join through jobs.
    const { data } = await supabase
      .from('galleries')
      .select('id, jobs!inner(studio_id)')
      .eq('id', item.parentId)
      .eq('jobs.studio_id', staff.studio_id)
      .maybeSingle();
    return !!data;
  }

  const { data } = await supabase
    .from('albums')
    .select('id')
    .eq('id', item.parentId)
    .eq('studio_id', staff.studio_id)
    .maybeSingle();
  return !!data;
}
