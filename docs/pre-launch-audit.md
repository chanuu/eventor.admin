# Pre-launch audit — admin app

Findings from a review of `apps/admin`, the database policies and the deployed
configuration. Ordered by what would hurt most in production.

**Status**

| # | Finding | State |
|---|---|---|
| 1 | Cross-tenant writes via service-role client | **Fixed and verified** |
| 2 | `sms_otp_debug` table still present | Outstanding |
| 3 | Plan changes take no payment | Outstanding |
| 4 | Public storage is permanent | Decision needed |
| 5 | Performance / query shapes | Outstanding |
| 6 | Silent failures (36 of 64 actions) | Partly done |
| 8 | **Bulk upload cannot scale past ~20 photos** | Outstanding — see §8 |

---

## 1. Cross-tenant writes through the service-role client — **critical** ✅ fixed

Several server actions use `createAdminClient()`, which uses the Supabase service
role and **bypasses RLS entirely**. They validate the `studioId` argument against
the session, but then trust the *other* ids the caller passes.

```ts
// apps/admin/src/app/(dashboard)/jobs/[id]/gallery/actions.ts
export async function deletePhoto(photoId, storagePath, galleryId, jobId, studioId) {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;   // studioId is the caller's own
  ...
  await admin.from('gallery_photos')
    .delete()
    .eq('id', photoId)
    .eq('gallery_id', galleryId);                   // never checked against the studio
}
```

Affected:

| Action | Consequence |
|---|---|
| `deletePhoto` | Delete another studio's photo |
| `uploadPhotos` | Insert photos into another studio's gallery |
| `addSelectedPhotos` | Pull another studio's photos into your own album |
| `movePage` | Reorder another studio's album pages |

**Why this is more than theoretical:** photo URLs are public and contain the ids —
`https://s3…/galleries/{studioId}/{galleryId}/{uuid}.jpg`. Any shared gallery or
album link hands a competitor the identifiers needed to attempt this.

**Fix:** verify ownership before the write, or drop the service-role client on
these paths so RLS applies. The cleanest change is to confirm the parent belongs
to `ctx.studio_id` first:

```ts
const { data: gallery } = await admin
  .from('galleries')
  .select('id, jobs!inner(studio_id)')
  .eq('id', galleryId)
  .single();
if (gallery?.jobs.studio_id !== ctx.studio_id) return { error: 'Not found.' };
```

Most of these actions do not need the service role at all — RLS already permits
the legitimate case. Using the normal client would have prevented the whole class.

### How it was fixed

Both action files now use the ordinary (RLS-respecting) client, and every action
that touches a child row proves the parent belongs to the caller's studio first.

One trap worth recording, because the first attempt fell into it: **being able to
read a row is not proof of owning it.** The `public_read_shared_albums` and
`public_read_shared_album_photos` policies deliberately expose published, shared
albums to everyone. So an ownership check written as "select it and see if a row
comes back" returns true for any *publicly shared* album belonging to another
studio — and `deleteFromS3()` would then have destroyed their file even though
the database row survived. The checks therefore match `studio_id` explicitly
(and join through `jobs` for galleries, which carry no `studio_id` of their own).

Equally, S3 paths are now read back from the stored row rather than taken from
the caller — `deletePhoto`, `removeAlbumMusic` and `uploadAlbumMusic` all deleted
whatever path they were handed.

Verified by moving all gallery/album rows to a second studio inside a transaction,
impersonating the original studio's staff user, and confirming every path returns
zero — then rolling back. Same queries against the studio's own rows still return
their data, so normal operation is unaffected.

**One consequence to be aware of:** because RLS now applies, the plan's feature
gate applies too. The `eventor` studio is on **Album Only**, whose features are
`album, clients, jobs` — no `gallery`. Its 11 existing proofing photos only exist
because the service-role client was bypassing that gate. Gallery uploads from that
studio will now be correctly refused. If you want to keep testing proofing, move
its subscription to `solo` or `studio`.

The gallery *detail* page was also reachable by direct URL without the feature
check (only the list page had it); it is gated now.

---

## 2. `sms_otp_debug` still exists — **high**

The table holding **live login codes** is still in the database (currently empty).
It was added for testing while no SMS gateway was connected.

```sql
DROP TABLE IF EXISTS sms_otp_debug;
```

Its safety depends entirely on nobody adding an RLS policy to it. Drop it before
launch. The send-SMS hook degrades gracefully — it falls back to writing codes to
the function log.

Related: `SMS_PROVIDER` is **not set** in Supabase secrets, so the hook would fall
through to its Notify.lk default with no credentials. Client phone login has not
been exercised end to end against a real gateway.

---

## 3. Plan changes take no payment — **high (commercial)**

`changePlan` writes the entitlement directly. Any user with `settings.manage` can
move their studio to the Network plan for free. Fine for testing; before launch
this must become a callback from the payment provider rather than something the
studio can call.

---

## 4. Public storage is permanent — **medium, by design**

`galleries/*` and `albums/*` are world-readable on S3. Unpublishing an album or
un-sharing it removes the app's link but **does not revoke the S3 URL** — anyone
holding it keeps access until the object is deleted.

This was a deliberate choice for shareability. Confirm it is still the one you
want for wedding albums, and if not, move to presigned URLs.

Also note **signup auto-confirms email** (`email_confirm: true`), so anyone can
create a studio with an address they do not own.

---

## 5. Performance

Nothing is slow at today's volumes; these are the things that degrade as studios
grow.

| Where | Problem | Cost at scale |
|---|---|---|
| `jobs/[id]/gallery/page.tsx` | Fetches **every `gallery_photos` row for the studio** to count photos per gallery | Worst offender — grows with total photos, not galleries |
| `dashboard/page.tsx` | Fetches **all** paid payments and **all** jobs on every load, no date bound | Linear growth, every dashboard view |
| `jobs/[id]/gallery/[galleryId]/page.tsx` | Loads every photo in a gallery, unpaginated | A 500-photo proofing set is 500 rows and 500 `<img>` |
| `album_pages.studio_id` | Not indexed | Minor |

The first three should use `count: 'exact', head: true` aggregates or pagination
rather than pulling rows to count them in JavaScript.

**Bigger than all of these:** the database is in **Tokyo** while Netlify functions
run in **US East**. Every query crosses the Pacific — measured 7.8 s cold, 1.1 s
warm against 0.83 s for the static portal. Moving the function region to
`ap-northeast-1` is the single largest available win.

---

## 6. Silent failures — **medium**

**36 of 64** server actions still `return;` with no message when a guard fails.
The user sees a button that does nothing. This has already caused one reported
bug ("contract not create and send properly").

Actions in contract, album, billing, platform and role management now return
`{ error }`. The remaining ones — mainly `jobs/actions.ts`, `clients`, `packages`,
`staff` — should follow.

---

## 7. Minor

- `client_phone_exists` is callable by anyone with the anon key and reveals
  whether a number belongs to a client. It exists to avoid paying for SMS to
  unknown numbers; the trade-off is a small enumeration oracle.
- No rate limiting on login or OTP request beyond Supabase defaults.
- `platform_admins` has no UI — adding an admin is a SQL insert.
- Lead sources cannot be edited by studios by design, but there is no UI to
  reorder them.

---

## What is solid

Worth stating, since the list above is all problems:

- **RLS is enabled on all 27 tables**, and every policy now checks permissions
  rather than the legacy role enum.
- **Permissions and plan entitlements are enforced in the database**, not just the
  UI — verified by impersonating a non-privileged user and getting
  `42501: Not authorised`.
- **No `dangerouslySetInnerHTML`** anywhere; the agreement renders in a sandboxed
  iframe.
- **The service-role key never reaches a client component** — checked every file
  carrying `'use client'`.
- Platform admin access is an explicit allow-list, re-checked inside each
  `SECURITY DEFINER` function.

---

## Suggested order

1. Fix the cross-tenant writes (§1) — this is the only finding that risks other
   studios' data.
2. Drop `sms_otp_debug` and finish SMS setup (§2).
3. Decide on payment before enabling self-service plan changes (§3).
4. Move the Netlify function region (§5).
5. Fix the gallery photo-count query (§5).
6. Work through the silent failures (§6).

---

## 8. Bulk upload cannot scale past ~20 photos — **critical**

Found after the sections above, in response to "sometimes it is more than 1000
images for proofing". This is not a slowdown — the current design **cannot
complete** such an upload.

`GalleryUploadForm` puts every selected file into one `FormData` and posts it to a
single server action. 1000 originals at ~6 MB each is a **~6 GB request body**.
`bodySizeLimit: '50mb'` is already 120x too small, and Netlify caps a function's
request body far below that, so in production it fails almost immediately.

Even if the body arrived, `uploadPhotos` loops **strictly sequentially**, and each
photo costs a sharp decode/resize/encode, an S3 PUT, and **its own** insert to the
Tokyo database — roughly 0.85 s. A thousand of those is about **14 minutes** against
Netlify's 10 s default timeout. `Buffer.from(await file.arrayBuffer())` also holds
everything in the function's memory, which exhausts it well before either limit.
Nothing is resumable: when it dies at photo 20, one error comes back and nobody
knows which 980 to retry.

Viewing is just as bad. Only **one size** is ever stored — the 2 MB full image —
and the proofing grid renders it into a 140 px tile, with no `loading="lazy"`, no
pagination and no virtualization, in **both** admin and the portal. That is up to
**2 GB downloaded to draw one grid**, on the mobile-first screen shown to customers.

**Fix — presigned direct-to-S3 uploads.** The server action returns presigned PUT
URLs, so no file data crosses the function at all. The browser compresses each
photo before upload, sends 4-6 in parallel with a progress bar and per-file retry,
and one batched insert records them. The function then does near-zero work, so
body limits and timeouts stop applying and the job becomes purely bandwidth-bound.
The same browser pass emits a ~300 px thumbnail stored alongside the full image,
taking the grid from ~2 GB to ~20 MB.

Scope: a presign action, a shared browser-side image utility, a rewritten uploader,
a `thumb_path` migration, and lazy-loading plus pagination in both grids.
