'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * A real Eventor digital album, live on the page. It is only loaded when the section
 * comes near the screen, so it costs nothing to visitors who never scroll that far.
 */
export default function AlbumEmbed({ src, title }: { src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        seen.disconnect();
      }
    }, { rootMargin: '400px' });
    seen.observe(el);
    return () => seen.disconnect();
  }, []);

  return (
    <div ref={box} className="sm-album">
      {near ? (
        <iframe src={src} title={title} allow="autoplay; fullscreen" allowFullScreen loading="lazy" />
      ) : (
        <div className="sm-album-wait">Opening the album…</div>
      )}
    </div>
  );
}
