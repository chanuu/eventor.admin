'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A button that plays a film over the page. Nothing of the film is fetched until it is
 * asked for, so it costs a visitor who never presses it nothing.
 */
export default function Film({
  src, poster, label, className,
}: {
  src: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button type="button" className={className ?? 'film-button'} onClick={() => setOpen(true)}>
        <span className="film-play" aria-hidden>▶</span>
        {label}
      </button>
      {open && (
        <div className="film-back" role="dialog" aria-modal="true" aria-label={label} onClick={() => setOpen(false)}>
          <div className="film-box" onClick={(e) => e.stopPropagation()}>
            <button ref={close} type="button" className="film-close" aria-label="Close the film" onClick={() => setOpen(false)}>×</button>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video src={src} poster={poster} controls autoPlay playsInline preload="auto" />
          </div>
        </div>
      )}
    </>
  );
}
