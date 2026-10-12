# Eventor — monorepo

Multi-tenant photography-studio SaaS for Sri Lanka. pnpm workspace; Supabase
(Postgres + RLS + edge functions); media on Backblaze B2 via its S3-compatible
API.

## Branching — read before any commit

`dev` is the integration branch. `main` is deployed. (The branch is `main`, not
`master`. In the admin repo the integration branch is called `development`.)

1. **Every branch starts from a freshly pulled `dev`:**
   ```bash
   git checkout dev && git pull origin dev && git checkout -b <feature>
   ```
   Not from `main`, and not from a stale local `dev`.
2. **Never commit or push directly to `main`.** It only receives `dev` through a
   PR. The sole exception is a hotfix.
3. **A hotfix branches off `main`** — and is only finished once `main` has been
   merged back into `dev` and pushed.

Before branching, check `dev` has not fallen behind:

```bash
git fetch origin
git rev-list --count origin/dev..origin/main    # must be 0
```

If it is not 0, sync first: on `dev`, `git merge origin/main` and push. To prove
a `dev` → `main` PR cannot lose work: `git merge-base --is-ancestor origin/main
origin/dev`.

This is a rule because it has been broken more than once, and the cost is
delayed: `main` reached 22 commits ahead of `dev`. Nothing was lost only because
`dev` had no commits of its own. The harm is not to `main` — it is that `dev`
stops representing what is released, so the next branch starts from a base
missing released work.

Full reasoning and recovery steps: [CONTRIBUTING.md](CONTRIBUTING.md).

## Which apps are live

| App | Location | Status |
|---|---|---|
| Landing | `apps/landing` (Next.js) | live — `eventorcrm.com` |
| Client portal | `apps/client-portal` (Vite SPA) | live — `portal.eventorcrm.com` |
| Studio admin | `chanuu/eventor-crm` (React SPA, **separate repo**) | live — `app.eventorcrm.com` |
| Studio admin (old) | `apps/admin` (Next.js) | **deprecated — do not change** |
| Backend | `supabase/` | live — shared by all of the above |

**`apps/admin` is deprecated.** It is not deployed and must not be modified. A
fix that looks like it belongs there belongs in the React admin repo instead —
and often in `supabase/functions/`, because the React app has no server and so
nowhere to hold a secret. Uploads are signed by the `storage` function; invites
go through `users`.

Everything under `supabase/` is live production code **even though the deprecated
admin sits beside it**.

## Things that are easy to get wrong

- **Secrets are per-surface.** The React admin ships only `VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY` — it deliberately has no service-role key. Storage
  credentials are Supabase secrets, read by the `storage` edge function.
- **Never run `next build` while `next dev` is running** on the same app. They
  share `.next` and the dev server starts throwing `MODULE_NOT_FOUND`.
- **Supabase secrets are returned as SHA-256 digests, not values.** To check one,
  hash the expected string and compare.
- **`studios.portal_url`** builds client album links. It is a per-studio database
  column, not an environment variable.

See also [docs/deployment.md](docs/deployment.md) and
[docs/s3-bucket-setup.md](docs/s3-bucket-setup.md).
