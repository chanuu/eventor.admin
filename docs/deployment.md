# Deployment — three sites from one repo

This monorepo contains three independent web apps. Netlify serves one app per
site, so there are **three Netlify sites connected to the same repository**,
each distinguished by its **Base directory**.

| App | Base directory | Type | Suggested URL |
|---|---|---|---|
| Landing | `apps/landing` | Next.js | `eventor.lk` + `www.eventor.lk` |
| Studio admin | `apps/admin` | Next.js | `admin.eventor.lk` |
| Client portal | `apps/client-portal` | Vite SPA | `portal.eventor.lk` |

Each app carries its own `netlify.toml` with the build command, publish
directory and redirects, so the only thing to set in the Netlify UI is the base
directory and the environment variables.

---

## 1. Create the sites

For each app: **Add new site → Import an existing project → pick this repo**,
then in **Site configuration → Build & deploy → Build settings**:

- **Base directory:** from the table above (e.g. `apps/admin`)
- Leave build command and publish directory blank — `netlify.toml` supplies them
- **Package manager:** pnpm (auto-detected from `pnpm-lock.yaml`)

Rename each site under **Site configuration → General → Site details → Change
site name** so the default URLs are readable while you set up DNS:
`eventor-admin.netlify.app`, `eventor-portal.netlify.app`, `eventor.netlify.app`.

> The two Next.js sites need the **Next.js Runtime** plugin
> (`@netlify/plugin-nextjs`), declared in their `netlify.toml`. Without it the
> build publishes static files only and every dynamic route returns 404.

---

## 2. Point the domains

In each site: **Domain management → Add a domain**.

If your DNS stays with your registrar, add these records:

| Type | Name | Value |
|---|---|---|
| CNAME | `admin` | `eventor-admin.netlify.app` |
| CNAME | `portal` | `eventor-portal.netlify.app` |
| CNAME | `www` | `eventor.netlify.app` |
| ALIAS / ANAME / A | `@` (apex) | Netlify's load balancer — Netlify shows the exact value |

Apex domains cannot use CNAME. Either use the ALIAS/ANAME record type if your
registrar supports it, or move the domain to Netlify DNS and let it manage the
apex automatically.

Netlify provisions Let's Encrypt certificates once DNS resolves — usually
minutes, occasionally up to a few hours.

---

## 3. Environment variables

Set per site under **Site configuration → Environment variables**. Nothing is
committed to the repo, so a missing variable here is the most common cause of a
site that builds but does not work.

### Admin (`apps/admin`)

```
NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  <anon key>
SUPABASE_SERVICE_ROLE_KEY      <service role key>     ← server only, never in the portal
NEXT_PUBLIC_APP_URL            https://admin.eventor.lk
S3_REGION                      ap-south-1
S3_BUCKET                      eventor.media
S3_ACCESS_KEY_ID               <key id>
S3_SECRET_ACCESS_KEY           <secret>
S3_PUBLIC_URL                  (optional CloudFront/custom domain)
```

`NEXT_PUBLIC_APP_URL` builds password-reset links, staff invite links and the
public album share link. Left at `http://localhost:3001`, those all break.

> **The storage variables are `S3_*`, not `AWS_*`.** Netlify reserves the `AWS_*`
> names for its own build infrastructure and rejects them as site variables.
> `apps/admin/src/lib/s3.ts` reads `S3_*` first and falls back to `AWS_*`, so an
> older local `.env` keeps working.

### Client portal (`apps/client-portal`)

```
VITE_SUPABASE_URL       https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY  <anon key>
VITE_APP_URL            https://portal.eventor.lk
VITE_ADMIN_URL          https://admin.eventor.lk    ← serves the album share page
```

Only `VITE_*` variables reach the browser bundle. **Never** put the service role
key in this site — it would ship to every visitor.

### Landing (`apps/landing`)

No variables required today.

---

## 4. Wire the apps together

- `VITE_ADMIN_URL` (portal) → the admin site. The portal embeds the branded
  album share page served from `/flipbook/<token>` on admin.
- `NEXT_PUBLIC_APP_URL` (admin) → itself. Used to print the share link studios
  copy for clients.
- Landing page "Client login" / "Studio login" links → the portal and admin
  domains.

---

## 5. Supabase configuration

**Auth → URL Configuration:**

- **Site URL:** `https://portal.eventor.lk`
- **Redirect URLs:** add every origin that signs users in —
  `https://portal.eventor.lk/**`, `https://admin.eventor.lk/**`, plus
  `http://localhost:3001/**` and `http://localhost:3002/**` for local work.

Logins fail silently against unlisted origins.

---

## 6. After the first deploy

- [ ] All three sites load over HTTPS on their own domain
- [ ] Admin login works (email + password)
- [ ] Portal login works (mobile + OTP) — see [customer-otp-login.md](customer-otp-login.md)
- [ ] A portal deep link survives a hard refresh, e.g.
      `https://portal.eventor.lk/portal/<jobId>/album`
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
| Album share link is `localhost` | `NEXT_PUBLIC_APP_URL` not set on the admin site |
| Photos 403 in the browser | S3 bucket policy missing `galleries/*` and `albums/*` public read |
| Build fails resolving `@eventor/*` | Base directory points somewhere the pnpm workspace root isn't visible |
