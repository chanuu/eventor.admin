# S3 bucket setup

Proofing photos and album pages live in S3. Supabase stores only the resulting
public URL, so rendering is just `<img src={storage_path}>`.

## Required: CORS

**Photos now upload from the browser straight to S3**, using presigned URLs. That
is a cross-origin `PUT`, so the bucket must allow it. Without this rule every
upload fails with a CORS error and nothing reaches the bucket.

S3 console → your bucket → **Permissions** → **Cross-origin resource sharing
(CORS)** → Edit:

```json
[
  {
    "AllowedHeaders": ["content-type", "cache-control"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedOrigins": [
      "https://eventorlk.netlify.app",
      "http://localhost:3001"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Replace the first origin with your real admin domain. Keep `localhost:3001` only
while developing. `AllowedHeaders` must include `cache-control`, because the
presigned URL is signed with a `Cache-Control` header and the browser sends it —
S3 rejects the request if the header is not permitted.

## Required: bucket policy

Photos are served directly by URL, so the objects must be publicly readable.
Both prefixes are needed — `albums/*` is easy to forget:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadPhotos",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": [
        "arn:aws:s3:::YOUR-BUCKET-NAME/galleries/*",
        "arn:aws:s3:::YOUR-BUCKET-NAME/albums/*"
      ]
    }
  ]
}
```

Use the plain bucket **name** in the ARN, not the bucket ARN itself.

Note this makes objects readable by anyone holding the URL, permanently —
un-sharing an album in the app removes its link but does not revoke access to the
underlying file. See §4 of [pre-launch-audit.md](pre-launch-audit.md).

## IAM permissions

The access key needs `s3:PutObject` and `s3:DeleteObject` on the same two
prefixes. `PutObject` is what presigning delegates to the browser — the browser
never sees the credentials, only a signed URL that expires in 15 minutes.

## Environment variables

Netlify reserves the `AWS_*` names for its own build infrastructure and refuses
them as site variables, so `S3_*` is canonical. The `AWS_*` names still work in a
local `.env`.

| Variable | Notes |
|---|---|
| `S3_REGION` | e.g. `ap-south-1` — must match the bucket's actual region |
| `S3_BUCKET` | bucket **name**, not an ARN |
| `S3_ACCESS_KEY_ID` | |
| `S3_SECRET_ACCESS_KEY` | |
| `S3_PUBLIC_URL` | optional CloudFront/CDN origin; falls back to the bucket URL |

A bucket name containing a dot breaks the wildcard TLS certificate on
virtual-hosted-style URLs, so the client switches to path-style addressing
automatically in that case. Both the public URL and the presigned upload URL
follow the same rule, and they must agree.

## Checking it works

Upload a photo from a gallery page. If it fails:

- **CORS error in the browser console** — the CORS rule above is missing or the
  origin does not match exactly (scheme and port included).
- **403 on the PUT** — the IAM key lacks `s3:PutObject` on that prefix.
- **The image records but does not display** — the bucket policy is missing, so
  the object uploaded but is not publicly readable.
- **SSL/hostname error** — the region is wrong, or a dotted bucket is being
  addressed virtual-hosted-style.
