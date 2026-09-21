'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import { makeDerivatives } from '@/lib/image-client';
import { createAvatarTicket, setStaffAvatar } from './avatar-actions';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * Click the picture to replace it.
 *
 * Reuses the gallery upload path: the browser resizes the image and PUTs it
 * straight to S3 with a presigned URL, so the file never crosses a server
 * action. makeDerivatives already produces a ~400px thumbnail, which is exactly
 * what an avatar needs — the full-size output is discarded.
 */
export default function AvatarUpload({
  staffId,
  name,
  url,
  size = 40,
}: {
  staffId: string;
  name: string;
  url: string | null;
  size?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError('That image is over 20 MB.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      const { thumb } = await makeDerivatives(file);

      const ticket = await createAvatarTicket(staffId);
      if (ticket.error || !ticket.uploadUrl || !ticket.publicUrl) {
        setError(ticket.error ?? 'Could not prepare the upload.');
        return;
      }

      const res = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        body: thumb,
        // Must match the headers the URL was signed with.
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      const saved = await setStaffAvatar(staffId, ticket.publicUrl);
      if (saved.error) {
        setError(saved.error);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error('[AvatarUpload]', err);
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function remove() {
    setBusy(true);
    setError('');
    const result = await setStaffAvatar(staffId, null);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={busy ? 'Uploading…' : 'Change picture'}
        className={`relative rounded-full transition-opacity ${busy ? 'opacity-50' : 'hover:opacity-80'}`}
      >
        <Avatar name={name} url={url} size={size} />
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white border border-line
                     grid place-items-center text-[9px] text-ink-muted leading-none"
        >
          ✎
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {url && !busy && (
        <button
          type="button"
          onClick={remove}
          className="text-xs text-ink-muted hover:text-red-600"
        >
          Remove
        </button>
      )}

      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
