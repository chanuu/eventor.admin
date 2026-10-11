# Media bucket setup (Backblaze B2)

Proofing photos, album pages, album music and staff avatars live in Backblaze
B2, reached through its S3-compatible API. Supabase stores only the resulting
public URL, so rendering is just `<img src={storage_path}>`.

**The live uploader is the React admin**, which has no server of its own, so the
keys live in the `storage` Edge Function
([`supabase/functions/storage/index.ts`](../supabase/functions/storage/index.ts)).
That function is what must be configured and deployed for uploads to work.

The Next app's [`apps/admin/src/lib/s3.ts`](../apps/admin/src/lib/s3.ts) carries
the same logic and is kept in step, but that app is no longer in use.

Neither is tied to B2: both talk to whatever `S3_ENDPOINT` names and fall back to
AWS when it is unset. That fallback keeps media uploaded before the move
resolving.

## One bucket, not several

Everything is separated by key prefix inside a single bucket.

| Prefix | Holds | Written by |
|---|---|---|
| `galleries/{studio}/{gallery}/{uuid}.jpg` and `…_thumb.jpg` | proofing photos | browser, presigned PUT |
| `albums/{studio}/{album}/{uuid}.jpg` | album page images | server action |
| `albums/{studio}/{album}/music/{uuid}.{ext}` | album background music | server action |
| `albums/{studio}/{flipbookId}.{ext}` | uploaded flipbook PDFs | server action |
| `avatars/{studio}/{staff}/{uuid}.jpg` | staff profile pictures (~400px) | browser, presigned PUT |

Studio logos are **not** here — they stay in the Supabase Storage bucket
`studio-assets`, governed by the policies in
`supabase/migrations/20260922000000_studio_assets_policies.sql`.

## Creating the bucket

- **Name** — e.g. `eventor-media`. B2 names are unique across all B2 accounts,
  6–50 characters, lowercase letters, digits and hyphens only, and cannot begin
  with `b2-`. Dots are not permitted, which is convenient: the dotted-bucket
  path-style workaround only matters on AWS.
- **Files in bucket: Public.** This is the significant difference from S3. B2
  has no per-prefix policy — public or private is a property of the whole
  bucket. Every prefix above needs public read, so public is correct, but it
  does mean anything placed in this bucket is world-readable by URL. Keep
  private data out of it.
- **Application key** scoped to this bucket only, with read and write.

Note the same caveat as before: public objects are readable by anyone holding
the URL, permanently. Un-sharing an album in the app removes the link but does
not revoke access to the underlying file. See §4 of
[pre-launch-audit.md](pre-launch-audit.md).

## Required: lifecycle rule

**B2 keeps every version of a file by default.** A delete writes a hide marker
and the old versions are retained — and billed — indefinitely. `deleteFromS3()`
therefore frees nothing on its own.

Set the bucket's lifecycle to **keep only the last version**, or storage grows
silently with every re-upload, avatar change and replaced flipbook.

## Required: CORS

Photos upload from the browser straight to the bucket using presigned URLs.
That is a cross-origin `PUT`, so the bucket must allow it, or every upload
fails in the browser and nothing arrives.

The B2 web console only offers coarse presets, so this has to be set through
the CLI:

```
b2 update-bucket --corsRules '[{
  "corsRuleName": "eventor",
  "allowedOrigins": ["https://app.eventorcrm.com", "http://localhost:3003"],
  "allowedOperations": ["s3_put", "s3_get", "s3_head"],
  "allowedHeaders": ["content-type", "cache-control"],
  "exposeHeaders": ["etag"],
  "maxAgeSeconds": 3000
}]' eventor-media allPublic
```

`allowedHeaders` must include `cache-control`. The browser sends both
`Content-Type` and `Cache-Control` with the PUT, and the preflight asks
permission for each — a header the rule omits fails the preflight and the
request is never sent.

On the live path these headers are also **part of the signature**: the Edge
Function signs with `allHeaders: true`, so `putToS3()` must send them byte for
byte or B2 answers `SignatureDoesNotMatch`. The two must be changed together.
(The legacy Next app signs `host` only, which is why the same mismatch surfaces
there as a CORS error instead — worth knowing when reading old notes.)

Origins must match exactly, scheme and port included: the React admin runs on
`http://localhost:3003` in development and `https://app.eventorcrm.com` in
production.

## Configuration

The keys belong to the Edge Function, as Supabase secrets — **not** to the React
app's build, which ships to the browser:

```
supabase secrets set \
  S3_ENDPOINT=https://s3.eu-central-003.backblazeb2.com \
  S3_REGION=eu-central-003 \
  S3_BUCKET=eventor-media \
  S3_ACCESS_KEY_ID=<b2 keyID> \
  S3_SECRET_ACCESS_KEY=<b2 applicationKey>

supabase functions deploy storage
```

Secrets are read at invocation, but deploy after changing them so the version
and its configuration are known to match.

The same names apply to the legacy Next app, where they are Netlify site
variables. Netlify reserves the `AWS_*` names for its own build infrastructure
and refuses them, which is why `S3_*` is canonical.

| Variable | Notes |
|---|---|
| `S3_ENDPOINT` | e.g. `https://s3.eu-central-003.backblazeb2.com`. Unset means AWS |
| `S3_REGION` | must be the region inside the endpoint, e.g. `eu-central-003` |
| `S3_BUCKET` | bucket **name** |
| `S3_ACCESS_KEY_ID` | B2 `keyID` |
| `S3_SECRET_ACCESS_KEY` | B2 `applicationKey` |
| `S3_PUBLIC_URL` | optional CDN origin; defaults to `<endpoint>/<bucket>` |

B2 ignores the region when routing but still verifies it in the SigV4
signature, so a region that disagrees with the endpoint fails every request.

Any non-AWS endpoint is addressed path-style (`<endpoint>/<bucket>/<key>`),
because a provider's wildcard certificate need not cover a bucket-name
subdomain. The public URL and the presigned upload URL are built from the same
flag, so they always agree.

## Checking it works

Upload a photo from a gallery page. If it fails:

- **CORS error in the browser console** — the CORS rule is missing, or the
  origin does not match exactly.
- **403 `SignatureDoesNotMatch`** — `S3_REGION` does not match the region in
  `S3_ENDPOINT`, or the application key is scoped to a different bucket.
- **403 on the PUT** — the key lacks write capability on this bucket.
- **The image records but does not display** — the bucket is private. B2 has no
  per-prefix policy, so this is bucket-wide.
- **Uploads work but old photos 404** — those rows hold AWS URLs from before
  the move; see below.

## Migrating what is already in S3

Switching the variables changes where *new* media goes. Existing rows store
absolute `amazonaws.com` URLs and keep pointing at AWS, so the old bucket must
stay reachable until its objects are copied to B2 and the stored URLs rewritten.
Until then, do not delete the AWS bucket.
