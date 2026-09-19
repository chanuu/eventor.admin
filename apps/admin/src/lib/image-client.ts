/**
 * Browser-side image resizing for uploads.
 *
 * Compression used to happen on the server with sharp, which meant every
 * original crossed the network at full size and the function did the work one
 * file at a time. Doing it here instead means a 6 MB camera JPEG leaves the
 * browser as ~400 KB, and the server is not involved in the upload at all.
 *
 * Each photo yields two files: the proofing image and a small thumbnail for the
 * grid, so opening a large gallery no longer downloads full-size images.
 */

/** Longest edge of the stored proofing image. */
const FULL_MAX_EDGE = 1920;
/** Longest edge of the grid thumbnail. */
const THUMB_MAX_EDGE = 400;

const FULL_QUALITY = 0.82;
const THUMB_QUALITY = 0.7;

/** Matches the old server-side ceiling so stored sizes stay predictable. */
const MAX_STORED_BYTES = 2 * 1024 * 1024;

/** Quality ladder applied only when the first attempt is still too large. */
const FALLBACK_QUALITY = [0.72, 0.62, 0.5];

export type Derivatives = {
  /** The proofing image shown in the lightbox. */
  full: Blob;
  /** The small image shown in grids. */
  thumb: Blob;
  width: number;
  height: number;
};

function scaledSize(bitmap: ImageBitmap, maxEdge: number): { w: number; h: number } {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxEdge / longest); // never enlarge
  return {
    w: Math.max(1, Math.round(bitmap.width * scale)),
    h: Math.max(1, Math.round(bitmap.height * scale)),
  };
}

async function encode(bitmap: ImageBitmap, maxEdge: number, quality: number): Promise<Blob> {
  const { w, h } = scaledSize(bitmap, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is unavailable in this browser.');

  // White ground so transparent PNGs do not encode as black in JPEG.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
      'image/jpeg',
      quality,
    );
  });
}

/**
 * Decodes, resizes and compresses one file. Throws if the file is not a readable
 * image, so the caller can skip it and carry on with the rest.
 */
export async function makeDerivatives(file: File): Promise<Derivatives> {
  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, which the old sharp .rotate() did.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('could not be read as an image');
  }

  try {
    let full = await encode(bitmap, FULL_MAX_EDGE, FULL_QUALITY);

    // Only step down when the first pass is genuinely too big, so ordinary
    // photos keep their quality.
    for (const quality of FALLBACK_QUALITY) {
      if (full.size <= MAX_STORED_BYTES) break;
      full = await encode(bitmap, FULL_MAX_EDGE, quality);
    }

    const thumb = await encode(bitmap, THUMB_MAX_EDGE, THUMB_QUALITY);
    const { w, h } = scaledSize(bitmap, FULL_MAX_EDGE);

    return { full, thumb, width: w, height: h };
  } finally {
    bitmap.close();
  }
}

/**
 * Runs `worker` over `items` with at most `limit` in flight.
 *
 * Uploads are network-bound, so a few at a time is much faster than one after
 * another, while still leaving the studio's connection usable.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
