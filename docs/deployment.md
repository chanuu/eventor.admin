# Deployment

Netlify serves one app per site, so each app is a separate Netlify site
distinguished by its **Base directory**.

| App | Base directory | Type | Live URL |
|---|---|---|---|
| Landing | `apps/landing` | Next.js | `eventorcrm.com` + `www.eventorcrm.com` |
| Client portal | `apps/client-portal` | Vite SPA | `portal.eventorcrm.com` |
| Studio admin | *separate repo* — [`chanuu/eventor-crm`](https://github.com/chanuu/eventor-crm) | React SPA | `app.eventorcrm.com` |

> **`apps/admin` (Next.js) is deprecated and not deployed.** The studio admin is
> now the React SPA in its own repository. Make no changes to `apps/admin`; see
> [CONTRIBUTING.md](../CONTRIBUTING.md). Everything below about `apps/admin` is
> retained only because the variable names and S3 notes still describe how the
> `storage` edge function behaves.

Each app in this repo carries its own `netlify.toml` with the build command,
publish directory and redirects, so the only thing to set in the Netlify UI is
the base directory and the environment variables.

Two settings bite in a monorepo, and both were the cause of real failed builds:
**Base directory** and **package path** must both point at the app
(`apps/landing`, `apps/client-portal`), and the publish directory is relative to
the base — setting it to `apps/landing/.next` while the base is already
`apps/landing` resolves to `apps/landing/apps/landing/.next` and the build exits
non-zero with nothing useful in the log.

---

## 1. Create the sites

For each app: **Add new site → Import an existing project → pick this repo**,
then in **Site configuration → Build & deploy → Build settings**:

- **Base directory:** from the table above (e.g. `apps/client-portal`)
- Leave build command and publish directory blank — `netlify.toml` supplies them
- **Package manager:** pnpm (auto-detected from `pnpm-lock.yaml`)

The sites as they exist today:
`eventorcrm.netlify.app` (landing), `eventor-portal.netlify.app` (portal),
`eventor-admin.netlify.app` (admin, from the other repo).

> The landing site needs the **Next.js Runtime** plugin
> (`@netlify/plugin-nextjs`), declared in its `netlify.toml`. Without it the
> build publishes static files only and every dynamic route returns 404.

> Creating a site through the Netlify **API** does not install a GitHub deploy
> key, so the build fails with `Host key verification failed` and the site never
> rebuilds on push. Connecting a repo needs the OAuth handshake in the browser.
> The portal site was deployed from a local build for this reason and is **not**
> yet connected to git.

---

## 2. Point the domains

In each site: **Domain management → Add a domain**.

If your DNS stays with your registrar, add these records:

DNS is at the registrar (Spaceship), on its own nameservers. The records in use:

| Type | Name | Value |
|---|---|---|
| A | `@` (apex) | `75.2.60.5` |
| A | `www` | `75.2.60.5` |
| CNAME | `app` | `eventor-admin.netlify.app` |
| CNAME | `portal` | `eventor-portal.netlify.app` |

A CNAME is the better choice for a subdomain, because it follows Netlify if that
load-balancer address ever changes. An A record to `75.2.60.5` works equally
well in practice — Netlify routes by `Host` header — and is the fallback when the
registrar's panel refuses to save a CNAME, which is why `www` is an A record.

Apex domains cannot use CNAME at all, hence the A record there.

Netlify provisions Let's Encrypt certificates once DNS resolves. Two things
cause a long delay that looks like a failure:

- **Resolvers cache "no such record" for the zone's SOA minimum** (an hour here).
  Netlify's own lookup is subject to it, so `POST /ssl` can keep returning
  `bad dns for custom domain` well after the record is correct. Check the
  authoritative nameservers directly rather than a public resolver.
- **A domain still attached to another Netlify account** cannot be added at all:
  the API answers `is owned by another account`, and releasing it means removing
  it from that account's *team* Domains list, not just the site.

Netlify provisions Let's Encrypt certificates once DNS resolves — usually
minutes, occasionally up to a few hours.

---

## 3. Environment variables

Set per site under **Site configuration → Environment variables**. Nothing is
committed to the repo, so a missing variable here is the most common cause of a
site that builds but does not work.

### Studio admin (React SPA, separate repo)

Built by Netlify from [`chanuu/eventor-crm`](https://github.com/chanuu/eventor-crm),
`main` branch. Only two variables, and both reach the browser:

```
VITE_SUPABASE_URL       https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY  <anon key>
```

There is **no service role key here, by design.** The app has no server, so
anything needing privileged credentials lives in an edge function instead — see
`supabase/functions/storage` for uploads and `supabase/functions/users` for
invites.

### Storage credentials (Supabase secrets, not a Netlify site)

Media uploads are signed by the `storage` edge function, so the keys are
Supabase secrets:

```
supabase secrets set \
  S3_ENDPOINT=https://s3.eu-central-003.backblazeb2.com \
  S3_REGION=eu-central-003 \
  S3_BUCKET=eventor-media \
  S3_ACCESS_KEY_ID=<b2 keyID> \
  S3_SECRET_ACCESS_KEY=<b2 applicationKey>
```

Media is on **Backblaze B2** via its S3-compatible API; see
[s3-bucket-setup.md](s3-bucket-setup.md). Objects uploaded before that move are
stored as absolute `amazonaws.com` URLs, so the old AWS bucket must stay
readable until they are copied across.

> **The names are `S3_*`, not `AWS_*`.** Netlify reserves the `AWS_*` names for
> its own build infrastructure and rejects them as site variables, so `S3_*` is
> canonical everywhere for consistency.

### Client portal (`apps/client-portal`)

```
VITE_SUPABASE_URL       https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY  <anon key>
VITE_APP_URL            https://portal.eventorcrm.com
VITE_ADMIN_URL          https://app.eventorcrm.com    ← serves the album share page
```

Only `VITE_*` variables reach the browser bundle. **Never** put the service role
key in this site — it would ship to every visitor.

### Landing (`apps/landing`)

Set in `apps/landing/netlify.toml` (they are public and inlined at build time):

```
NEXT_PUBLIC_ADMIN_URL   https://app.eventorcrm.com      ← Sign up / Sign in
NEXT_PUBLIC_PORTAL_URL  https://portal.eventorcrm.com   ← live demo link
```

Locally, `.env.local` (from `.env.example`) points them at localhost.

---

## 4. Wire the apps together

- `VITE_ADMIN_URL` (portal) → the admin site. The portal embeds the branded
  album share page served from `/flipbook/<token>` on admin.
- **`studios.portal_url` → the portal.** This is a per-studio database column,
  set in the admin under Settings → "Client portal website", and it is what
  builds the album link a studio copies for a client. It is not an environment
  variable, so it has to be filled in per studio. A studio that leaves it blank
  gets a link with no host at all.
- Landing page "Client login" / "Studio login" links → the portal and admin
  domains.

---

## 5. Supabase configuration

**Auth → URL Configuration:**

- **Site URL:** `https://portal.eventorcrm.com`
- **Redirect URLs:** add every origin that signs users in —
  `https://portal.eventorcrm.com/**`, `https://app.eventorcrm.com/**`, plus
  `http://localhost:3001/**` and `http://localhost:3002/**` for local work.

Logins fail silently against unlisted origins.

---

## 6. After the first deploy

- [ ] All three sites load over HTTPS on their own domain
- [ ] Admin login works (email + password)
- [ ] Portal login works (mobile + OTP) — see [customer-otp-login.md](customer-otp-login.md)
- [ ] A portal deep link survives a hard refresh, e.g.
      `https://portal.eventorcrm.com/portal/<jobId>/album`
- [ ] Uploading a gallery photo in admin succeeds and displays in the portal
- [ ] The album share link opens for a signed-out visitor

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| Every route 404s, including `/` | Base directory not set, build failed, or the Next.js Runtime plugin is missing |
| Site root loads, deep links 404 | Portal SPA redirect missing — `netlify.toml` and `public/_redirects` both provide it |
| Portal loads but no data | `VITE_*` variables missing; Vite only exposes that prefix |
| Login redirects to the wrong place | Supabase Auth redirect URLs don't include the deployed origin |
| Album share link has no host, or is a street address | `studios.portal_url` blank or not a URL — Settings → "Client portal website" |
| Photos upload but render broken | The B2 bucket is private. B2 has no per-prefix policy, so this is bucket-wide |
| Uploads fail as a CORS error | Often *not* CORS: B2's 401/403 carries no `Access-Control-*` headers, so any auth failure is reported by the browser as CORS. Check the real status outside a browser first |
| Build fails resolving `@eventor/*` | Base directory points somewhere the pnpm workspace root isn't visible |
| Build exits 2 with an unhelpful log | Publish directory duplicated under the base directory, or `package_path` pointing at the wrong app |
