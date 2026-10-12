import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Object-storage helper for gallery / proofing photos, album pages and avatars.
 *
 * Media lives in Backblaze B2, reached through its S3-compatible API — which is
 * why this still speaks S3 and keeps the S3_* names. Supabase stores only the
 * resulting public URL in `gallery_photos.storage_path`, so rendering is just
 * `<img src={storage_path}>`.
 *
 * Nothing here is AWS-specific any more: the provider is whatever `S3_ENDPOINT`
 * names. Leaving it unset falls back to AWS, so rows written before the move
 * keep resolving and an .env still pointed at AWS keeps working.
 */

/**
 * Netlify reserves the AWS_* names for its own build infrastructure and refuses
 * to accept them as site variables, so S3_* is the canonical set. The AWS_*
 * names are still read as a fallback for local .env files.
 */
const REGION      = process.env.S3_REGION            ?? process.env.AWS_REGION            ?? '';
const BUCKET      = process.env.S3_BUCKET            ?? process.env.AWS_S3_BUCKET         ?? '';
const ACCESS_KEY  = process.env.S3_ACCESS_KEY_ID     ?? process.env.AWS_ACCESS_KEY_ID     ?? '';
const SECRET_KEY  = process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY ?? '';
/** S3-compatible API origin, e.g. https://s3.eu-central-003.backblazeb2.com. Empty means AWS. */
const ENDPOINT    = (process.env.S3_ENDPOINT ?? '').replace(/\/$/, '');
/** Optional CDN origin in front of the bucket. Falls back to the bucket URL. */
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL ?? process.env.AWS_S3_PUBLIC_URL ?? '').replace(/\/$/, '');

/**
 * Address the bucket as `<origin>/<bucket>/<key>` rather than `<bucket>.<origin>/<key>`.
 *
 * Forced for any non-AWS endpoint, because a provider's wildcard certificate is
 * not guaranteed to cover a bucket-name subdomain, and forced for dotted bucket
 * names, where `*.s3.<region>.amazonaws.com` matches a single label and the TLS
 * handshake fails. `publicUrlFor` reads the same flag, so the URL we hand out
 * and the URL we sign always agree — were they to diverge, uploads would land
 * somewhere the app never looks.
 */
const PATH_STYLE = Boolean(ENDPOINT) || BUCKET.includes('.');

/** The API origin, whichever provider is configured. */
function originUrl(): string {
  return ENDPOINT || `https://s3.${REGION}.amazonaws.com`;
}

export function isS3Configured(): boolean {
  return Boolean(REGION && BUCKET && ACCESS_KEY && SECRET_KEY);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      // B2 ignores the region when routing, but the v4 signer still needs one
      // and it must be the region named in the endpoint or every request is
      // rejected as a signature mismatch.
      region: REGION,
      endpoint: ENDPOINT || undefined,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
      forcePathStyle: PATH_STYLE,
    });
  }
  return client;
}

function publicUrlFor(key: string): string {
  const defaultBase = PATH_STYLE
    ? `${originUrl()}/${BUCKET}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
  const base = PUBLIC_BASE || defaultBase;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** Uploads a buffer and returns its public URL. Throws if S3 is not configured. */
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!isS3Configured()) throw new Error('Object storage is not configured. Set S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY and — for Backblaze B2 — S3_ENDPOINT.');

  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return publicUrlFor(key);
}

/**
 * Mints a short-lived PUT URL so the browser can send a file straight to S3.
 *
 * This exists because routing photos through a server action does not scale: a
 * proofing set of 1000 images is several GB in one request body, which exceeds
 * the platform's limit long before the function's time limit is reached. With a
 * presigned URL the file never touches our server, so a big upload is bound only
 * by the studio's bandwidth.
 *
 * Returns both the URL to PUT to and the public URL the object will have, so the
 * caller can record it without a second round trip.
 */
export async function presignUpload(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!isS3Configured()) throw new Error('S3 is not configured. Set the S3_* environment variables.');

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn: expiresInSeconds },
  );

  return { uploadUrl, publicUrl: publicUrlFor(key) };
}

/** True for values that are already full URLs (S3-era rows) vs. legacy Supabase storage paths. */
export function isS3Url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/**
 * Every top-level prefix the app writes. A key always begins with one of these,
 * which is what lets `keyFromUrl` tell a bucket segment from the key itself.
 */
const KEY_PREFIXES = ['galleries/', 'albums/', 'avatars/'] as const;

/** Recovers the object key from a URL produced by `uploadToS3`. Null if it isn't ours. */
export function keyFromUrl(url: string): string | null {
  if (!isS3Url(url)) return null;
  try {
    const path = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    if (!path) return null;

    // Path-style URLs carry the bucket as the first segment, virtual-hosted ones
    // do not, and both forms are in the data — rows predating the move to B2 used
    // a dotted AWS bucket, which forced path style there too. Matching on BUCKET
    // alone therefore mis-parsed every legacy URL once the bucket was renamed,
    // leaving the old name glued to the front of the key. Recognising the key's
    // own prefix instead is independent of whatever the bucket was called.
    if (KEY_PREFIXES.some((p) => path.startsWith(p))) return path;

    const withoutBucket = path.slice(path.indexOf('/') + 1);
    return KEY_PREFIXES.some((p) => withoutBucket.startsWith(p)) ? withoutBucket : null;
  } catch {
    return null;
  }
}

/** Best-effort delete; ignores failures so DB cleanup still proceeds. */
export async function deleteFromS3(url: string): Promise<void> {
  const key = keyFromUrl(url);
  if (!key || !isS3Configured()) return;
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // orphaned object is preferable to a failed delete
  }
}
