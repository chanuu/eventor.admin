/**
 * Supabase "Send SMS" auth hook → local Sri Lankan SMS gateway.
 *
 * Supabase's built-in phone auth only speaks Twilio / Vonage / MessageBird /
 * Textlocal. This hook intercepts the OTP before Supabase would send it and
 * delivers it through a local provider instead.
 *
 * Configure in Supabase: Auth → Hooks → Send SMS hook → point at this function,
 * and set the secrets listed below.
 *
 *   SMS_PROVIDER      console | notify_lk | text_lk | dialog | custom  (default notify_lk)
 *                     console = no SMS sent, code written to the function logs.
 *                     For pre-launch testing only.
 *   SMS_SENDER_ID     approved alphanumeric sender / mask
 *   SEND_SMS_HOOK_SECRET   the "v1,whsec_..." value Supabase shows for the hook
 *
 * Provider credentials:
 *   notify_lk → NOTIFY_LK_USER_ID, NOTIFY_LK_API_KEY
 *   text_lk   → TEXT_LK_API_TOKEN
 *   dialog    → DIALOG_USERNAME, DIALOG_PASSWORD
 *   custom    → CUSTOM_SMS_URL, CUSTOM_SMS_TOKEN (POST {to, message})
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

type HookPayload = {
  user: { phone?: string };
  sms: { otp: string };
};

const PROVIDER  = Deno.env.get('SMS_PROVIDER') ?? 'notify_lk';
const SENDER_ID = Deno.env.get('SMS_SENDER_ID') ?? 'Eventor';
const HOOK_SECRET = Deno.env.get('SEND_SMS_HOOK_SECRET') ?? '';

/** Local gateways expect 94771234567 — digits only, no plus. */
function localFormat(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 9 ? `94${digits.slice(-9)}` : digits;
}

function messageFor(otp: string): string {
  return `${otp} is your Eventor verification code. It expires in 5 minutes. Do not share it with anyone.`;
}

async function sendViaNotifyLk(to: string, message: string): Promise<Response> {
  const url = new URL('https://app.notify.lk/api/v1/send');
  url.searchParams.set('user_id', Deno.env.get('NOTIFY_LK_USER_ID') ?? '');
  url.searchParams.set('api_key', Deno.env.get('NOTIFY_LK_API_KEY') ?? '');
  url.searchParams.set('sender_id', SENDER_ID);
  url.searchParams.set('to', to);
  url.searchParams.set('message', message);
  return fetch(url, { method: 'POST' });
}

async function sendViaTextLk(to: string, message: string): Promise<Response> {
  return fetch('https://app.text.lk/api/v3/sms/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('TEXT_LK_API_TOKEN') ?? ''}`,
    },
    body: JSON.stringify({ recipient: to, sender_id: SENDER_ID, type: 'plain', message }),
  });
}

async function sendViaDialog(to: string, message: string): Promise<Response> {
  return fetch('https://esms.dialog.lk/api/v1/message-servlet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: Deno.env.get('DIALOG_PASSWORD') ?? '',
      esmsqk: Deno.env.get('DIALOG_USERNAME') ?? '',
      list: [{ mobile: to }],
      message,
      sourceAddress: SENDER_ID,
    }),
  });
}

/**
 * TESTING ONLY. Sends nothing; records the code in sms_otp_debug so testers can
 * read it from the Supabase table editor while no gateway is live.
 */
async function sendViaConsole(to: string, otp: string): Promise<Response> {
  console.log(`[send-sms-hook] TEST MODE — OTP for ${to} is ${otp}`);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !key) {
    // Logging alone still lets testing proceed via `supabase functions logs`.
    return new Response('{}', { status: 200 });
  }

  const res = await fetch(`${url}/rest/v1/sms_otp_debug`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ phone: to, otp }),
  });

  if (!res.ok) console.error('[send-sms-hook] could not record test OTP', res.status, await res.text());
  return new Response('{}', { status: 200 });
}

async function sendViaCustom(to: string, message: string): Promise<Response> {
  return fetch(Deno.env.get('CUSTOM_SMS_URL') ?? '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('CUSTOM_SMS_TOKEN') ?? ''}`,
    },
    body: JSON.stringify({ to, message, sender_id: SENDER_ID }),
  });
}

function send(to: string, message: string, otp: string): Promise<Response> {
  switch (PROVIDER) {
    case 'console': return sendViaConsole(to, otp);
    case 'text_lk': return sendViaTextLk(to, message);
    case 'dialog':  return sendViaDialog(to, message);
    case 'custom':  return sendViaCustom(to, message);
    default:        return sendViaNotifyLk(to, message);
  }
}

/** Hook errors must use this shape for Supabase to surface them properly. */
function fail(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: { http_code: status, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail('Method not allowed', 405);

  const raw = await req.text();

  // Verify the request really came from Supabase Auth.
  let payload: HookPayload;
  try {
    if (HOOK_SECRET) {
      const wh = new Webhook(HOOK_SECRET.replace('v1,whsec_', ''));
      payload = wh.verify(raw, Object.fromEntries(req.headers)) as HookPayload;
    } else {
      payload = JSON.parse(raw) as HookPayload;
    }
  } catch (err) {
    console.error('[send-sms-hook] signature verification failed', err);
    return fail('Invalid signature', 401);
  }

  const phone = payload.user?.phone;
  const otp = payload.sms?.otp;
  if (!phone || !otp) return fail('Missing phone or otp in payload', 400);

  try {
    const res = await send(localFormat(phone), messageFor(otp), otp);
    const body = await res.text();

    if (!res.ok) {
      console.error('[send-sms-hook] gateway rejected', res.status, body);
      return fail(`SMS gateway error (${res.status})`, 502);
    }

    // Several local gateways return HTTP 200 with a failure status in the body.
    if (/"status"\s*:\s*"(error|failed)"/i.test(body)) {
      console.error('[send-sms-hook] gateway reported failure', body);
      return fail('SMS gateway could not deliver the code', 502);
    }

    console.log('[send-sms-hook] sent via', PROVIDER, 'to', localFormat(phone).slice(0, 5) + '****');
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-sms-hook] request failed', err);
    return fail('Could not reach the SMS gateway', 502);
  }
});
