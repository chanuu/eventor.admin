# Customer login — mobile OTP

How customers sign in to the client portal, how to test it before an SMS gateway
is live, and what to do at go-live.

Staff/admin login is **unaffected** — the admin app keeps email + password
(`signInWithPassword`). Only the client portal uses OTP.

---

## How it works

```
Customer enters mobile (077 123 4567)
  → portal calls client_phone_exists()      ← rejects unknown numbers, no SMS sent
  → supabase.auth.signInWithOtp({ phone })
  → Supabase generates the code, calls the Send SMS hook
  → send-sms-hook edge function → local SMS gateway
  → customer enters code → verifyOtp()
  → trigger links auth user to the clients row → portal loads
```

| Piece | Location |
|---|---|
| Login screen | `apps/client-portal/src/pages/LoginPage.tsx` |
| Phone formatting | `apps/client-portal/src/lib/phone.ts` |
| SMS delivery | `supabase/functions/send-sms-hook/index.ts` |
| Linking + normalisation | `supabase/migrations/20260811001000_client_phone_login.sql` |
| Test OTP capture | `supabase/migrations/20260811002000_sms_otp_debug_log.sql` |

### Phone numbers

Studios enter numbers locally (`0771234567`); Supabase requires E.164
(`+94771234567`). Both sides reduce to the **last 9 digits**, so either format
matches. `normalize_phone()` in Postgres and `significantDigits()` in TypeScript
implement the same rule.

### Account linking

Nothing links a customer to their data until they log in. On first successful
verification, a trigger on `auth.users` sets `clients.user_id` where the
normalised phone matches. All portal RLS resolves through
`get_my_client_id() → clients WHERE user_id = auth.uid()`.

The trigger only fires for auth users **with a phone**. Staff sign up with email
and no phone, so staff accounts are never touched.

**A client with no phone number in admin cannot log in.** There is no email
fallback.

---

## Testing before SMS goes live

No SMS is sent. Codes are written to a locked-down table you read from the
Supabase dashboard.

### 1. Deploy the hook in test mode

```bash
npx supabase functions deploy send-sms-hook
npx supabase secrets set SMS_PROVIDER=console
```

### 2. Enable phone auth

Supabase Dashboard:

1. **Auth → Hooks → Send SMS hook** → enable. Set **Hook type: HTTPS** (not
   Postgres — that option is for a plpgsql function, which cannot make outbound
   HTTP calls). URL:

   ```
   https://<project-ref>.supabase.co/functions/v1/send-sms-hook
   ```

2. Copy the generated `v1,whsec_…` secret and set it:

   ```bash
   npx supabase secrets set SEND_SMS_HOOK_SECRET='v1,whsec_...'
   ```

3. **Auth → Providers → Phone** → enable.

Enable the hook *first*: the dialog notes "SMS Provider settings will be
disabled in favor of SMS hooks", which usually removes the provider-credential
requirement.

> **The Phone provider form will not save with blank Twilio fields.** If it
> still demands them, either use the Management API (below) or enter
> format-valid placeholders — the hook intercepts sending, so Twilio is never
> called:
>
> | Field | Placeholder |
> |---|---|
> | Account SID | `AC00000000000000000000000000000000` |
> | Auth Token | `00000000000000000000000000000000` |
> | Message Service SID | `MG00000000000000000000000000000000` |
> | From number (if asked instead) | `+15005550006` |

#### Alternative: Management API

Sets the same flags without touching the dashboard form. Token from
supabase.com/dashboard/account/tokens:

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/<project-ref>/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_phone_enabled": true,
    "hook_send_sms_enabled": true,
    "hook_send_sms_uri": "https://<project-ref>.supabase.co/functions/v1/send-sms-hook",
    "hook_send_sms_secrets": "v1,whsec_YOUR_SECRET"
  }'
```

#### JWT verification

Edge functions verify a JWT by default, but Supabase Auth calls hooks **without
one**, so the hook would return 401 on every invocation. `verify_jwt = false` is
set for this function in `supabase/config.toml`; if deploying manually, use:

```bash
npx supabase functions deploy send-sms-hook --no-verify-jwt
```

The request is still authenticated — by the standardwebhooks signature checked
inside the function against `SEND_SMS_HOOK_SECRET`.

### 2b. Simplest option: test phone numbers

For routine development, **Auth → Providers → Phone → Test phone numbers** maps
a number to a fixed code:

```
+94771234567 = 123456
```

No SMS, no gateway, and the hook is never called — but a real auth user is still
created, so account linking is exercised. Numbers not listed behave normally.

Use this for day-to-day work; use the `console` mode above when you need to test
the hook and gateway themselves.

> Remove test numbers before production. A fixed, non-expiring code on a real
> mobile is a permanent login bypass for that account.

### 3. Log in and read the code

1. Open the portal, enter a client's mobile number.
2. Read the code from **Table Editor → `sms_otp_debug`** — newest row for that
   phone (stored as `94771234567`).
3. Enter it in the portal.

Terminal alternative:

```bash
npx supabase functions logs send-sms-hook
```

Rows older than one hour are pruned automatically on each insert.

> **`sms_otp_debug` holds live login codes.** RLS is enabled with **no
> policies**, so only the service role can read it. Never add a policy to this
> table — doing so would expose every customer's login code.

---

## Going live with a real gateway

Supabase's built-in phone auth only speaks Twilio / Vonage / MessageBird /
Textlocal, so a Sri Lankan gateway goes through the Send SMS hook. The function
has adapters for Notify.lk, Text.lk and Dialog eSMS, plus a generic HTTP option.

### Notify.lk

```bash
npx supabase secrets set \
  SMS_PROVIDER=notify_lk \
  SMS_SENDER_ID=YourMask \
  NOTIFY_LK_USER_ID=... \
  NOTIFY_LK_API_KEY=...
```

### Text.lk

```bash
npx supabase secrets set \
  SMS_PROVIDER=text_lk \
  SMS_SENDER_ID=YourMask \
  TEXT_LK_API_TOKEN=...
```

### Dialog eSMS

```bash
npx supabase secrets set \
  SMS_PROVIDER=dialog \
  SMS_SENDER_ID=YourMask \
  DIALOG_USERNAME=... \
  DIALOG_PASSWORD=...
```

### Any other gateway

```bash
npx supabase secrets set \
  SMS_PROVIDER=custom \
  CUSTOM_SMS_URL=https://gateway.example.lk/send \
  CUSTOM_SMS_TOKEN=...
```

Sends `POST {to, message, sender_id}` with a bearer token. For a different
request shape, add an adapter in `send-sms-hook/index.ts` — each is ~10 lines.

Switching providers needs no redeploy: change the secrets and Supabase picks
them up on the next invocation.

> **Sender ID / mask must be pre-approved by the Sri Lankan operators.** This is
> usually the longest lead time in going live — start it early.

---

## Go-live checklist

- [ ] Every client record has a mobile number (no phone = no access)
- [ ] Sender ID / mask approved by operators
- [ ] Gateway credentials set as secrets, `SMS_PROVIDER` no longer `console`
- [ ] Test OTP received by real SMS end to end
- [ ] **Drop the test table:** `DROP TABLE IF EXISTS sms_otp_debug;`
- [ ] Confirm admin/staff email + password login still works

Dropping `sms_otp_debug` is safe with the hook still deployed — the console
adapter falls back to writing codes to the function logs.

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| "We don't recognise this number" | No `clients` row with that phone. Check the record in admin. |
| Code never arrives | Hook not enabled, or gateway rejected it. Check `npx supabase functions logs send-sms-hook`. |
| `signInWithOtp` errors immediately | Phone provider not enabled in Auth → Providers. |
| Signs in but portal shows "No events yet" | `clients.user_id` didn't link — phone mismatch. Compare `normalize_phone(clients.phone)` with `normalize_phone(auth.users.phone)`. |
| Hook returns 401 | `SEND_SMS_HOOK_SECRET` doesn't match Auth → Hooks, or the function was deployed without `--no-verify-jwt`. |
| Twilio auth errors in the auth logs | The hook isn't being invoked — the placeholder credentials are being used for real. Check the hook is enabled and set to HTTPS. |
| Studio name / crew blank in portal | `20260811000000_client_portal_read_access.sql` not applied. |

### Useful queries

```sql
-- Clients who cannot log in (no usable phone)
SELECT id, full_name, phone FROM clients
WHERE normalize_phone(phone) IS NULL;

-- Who has portal access
SELECT full_name, phone, user_id IS NOT NULL AS can_log_in FROM clients;

-- Most recent test codes
SELECT phone, otp, created_at FROM sms_otp_debug
ORDER BY created_at DESC LIMIT 10;
```
