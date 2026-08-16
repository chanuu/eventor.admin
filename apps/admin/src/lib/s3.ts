import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * S3 upload helper for gallery / proofing photos.
 *
 * Photos live in S3; Supabase only stores the resulting public URL in
 * `gallery_photos.storage_path`, so rendering is just `<img src={storage_path}>`.
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
/** Optional CDN/CloudFront origin, e.g. https://cdn.example.com. Falls back to the bucket URL. */
const PUBLIC_BASE = (process.env.S3_PUBLIC_URL ?? process.env.AWS_S3_PUBLIC_URL ?? '').replace(/\/$/, '');

export function isS3Configured(): boolean {
  return Boolean(REGION && BUCKET && ACCESS_KEY && SECRET_KEY);
}

let client: S3Client | null = null;
function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: REGION,
      credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
    });
  }
  return client;
}

function publicUrlFor(key: string): string {
  // Bucket names containing a dot break the wildcard TLS cert on virtual-hosted-style
  // URLs (*.s3.<region>.amazonaws.com matches one label only), so use path-style there.
  const defaultBase = BUCKET.includes('.')
    ? `https://s3.${REGION}.amazonaws.com/${BUCKET}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com`;
  const base = PUBLIC_BASE || defaultBase;
  return `${base}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/** Uploads a buffer and returns its public URL. Throws if S3 is not configured. */
export async function uploadToS3(key: string, body: Buffer, contentType: string): Promise<string> {
  if (!isS3Configured()) throw new Error('S3 is not configured. Set AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');

  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return publicUrlFor(key);
}

/** True for values that are already full URLs (S3-era rows) vs. legacy Supabase storage paths. */
export function isS3Url(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

/** Recovers the object key from a URL produced by `uploadToS3`. Null if it isn't ours. */
export function keyFromUrl(url: string): string | null {
  if (!isS3Url(url)) return null;
  try {
    let path = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
    // Path-style URLs (dotted bucket names) carry the bucket as the first segment.
    if (BUCKET && path.startsWith(`${BUCKET}/`)) path = path.slice(BUCKET.length + 1);
    return path || null;
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
