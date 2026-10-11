# Working in this repo

## Branches

`dev` is the integration branch. `main` is what is deployed.

**Every new branch starts from a freshly pulled `dev`:**

```bash
git checkout dev
git pull origin dev          # not optional — see below
git checkout -b <feature>
```

Pulling first matters more than it looks. Branching from a stale `dev` means the
feature branch is missing whatever landed while you were away, and that only
surfaces later as a conflict in the PR, or as a change you quietly reverted.

Do **not** branch from `main`. The one exception is a hotfix, below.

## main is never written to directly

No commits, no pushes, no merges straight to `main`. It only ever receives `dev`
through a pull request.

This is a rule because it has already been broken, twice, and the cost was not
obvious at the time: `main` ended up **22 commits ahead of `dev`** — the whole
landing-page revamp plus `c9736f8` (storage and users functions). Nothing was
lost, because `dev` happened to have no commits of its own and could be
fast-forwarded. Had anyone been working on `dev` at the time, the next merge
would have been a conflict in every file both sides touched.

The damage from bypassing `dev` is not to `main`; it is that `dev` silently stops
representing what is released, so the next person branches from a base that is
missing released work.

## Hotfixes

A genuine production emergency is the only reason to touch `main` outside the
normal flow:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<thing>
# fix, then PR into main
```

**Then immediately bring `main` back into `dev`:**

```bash
git checkout dev
git pull origin dev
git merge origin/main
git push origin dev
```

Skipping that last step is exactly how the 22-commit gap formed. A hotfix is not
finished when it ships; it is finished when `dev` contains it.

## Checking whether dev has fallen behind

Before branching, if in doubt:

```bash
git fetch origin
git rev-list --count origin/dev..origin/main   # commits on main that dev lacks → should be 0
git rev-list --count origin/main..origin/dev   # commits on dev not yet released → fine, any number
```

If the first number is not zero, `main` has work `dev` lacks. Fix it before
branching:

```bash
git checkout dev && git pull origin dev
git merge origin/main && git push origin dev
```

To confirm a `dev` → `main` PR cannot lose anything, check that `main` is already
contained in `dev`:

```bash
git merge-base --is-ancestor origin/main origin/dev && echo "safe"
```

If that prints `safe`, every commit on `main` is already in `dev` and the merge
can only move forward.

## Commit messages

Explain why the change was needed, not what the diff shows. The diff already
says what changed; it cannot say what was broken, what was tried, or what
constraint forced the approach.

---

# Which apps are live

| App | Location | Status |
|---|---|---|
| Landing | `apps/landing` (Next.js) | **live** — `eventorcrm.com` |
| Client portal | `apps/client-portal` (Vite SPA) | **live** — `portal.eventorcrm.com` |
| Studio admin | [`chanuu/eventor-crm`](https://github.com/chanuu/eventor-crm) (React SPA, separate repo) | **live** — `app.eventorcrm.com` |
| Studio admin (old) | `apps/admin` (Next.js) | **deprecated — do not change** |
| Edge functions / migrations | `supabase/` | **live** — shared by all of the above |

## `apps/admin` is deprecated

The Next.js studio admin has been replaced by the React SPA in
[`chanuu/eventor-crm`](https://github.com/chanuu/eventor-crm). **Make no changes
to `apps/admin`.** It is not deployed and is kept only as a reference for
behaviour that has not yet been re-read in the React app.

If a fix seems to belong in `apps/admin`, it belongs in the React admin instead —
and often in `supabase/functions/`, because the React app has no server and
therefore no place to hold a secret. The storage credentials are the clearest
example: the Next app signed uploads in a server action, whereas the React app
calls the `storage` edge function, which is the only thing holding the keys.

One consequence worth knowing: `supabase/` still serves the live apps, so
migrations and functions here are production code even though the admin app
beside them is not.
