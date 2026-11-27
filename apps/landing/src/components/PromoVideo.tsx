'use client';

import { useRef, useState } from 'react';

/**
 * The main promo film, large on the page. It shows a still with a play button, and plays
 * in place, with sound, when pressed. Nothing of the film is fetched until then.
 */
export default function PromoVideo({
  src, thumb, title, length,
}: {
  src: string;
  /** Path without the size: `-960.webp` and `-1600.webp` are added. */
  thumb: string;
  title: string;
  /** Shown on the button, such as 1:17. */
  length: string;
}) {
  const [playing, setPlaying] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  return (
    <div className="promo">
      {playing ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video ref={video} src={src} poster={`${thumb}-1600.webp`} controls autoPlay playsInline />
      ) : (
        <button type="button" className="promo-thumb" onClick={() => setPlaying(true)} aria-label={`Play ${title}, ${length}`}>
          <img
            src={`${thumb}-1600.webp`}
            srcSet={`${thumb}-960.webp 960w, ${thumb}-1600.webp 1600w`}
            sizes="(max-width: 1240px) 100vw, 1200px"
            alt=""
            width={1600}
            height={900}
          />
          <span className="promo-play" aria-hidden><span /></span>
          <span className="promo-label" aria-hidden>
            <strong>{title}</strong>
            <span>{length}</span>
          </span>
        </button>
      )}
    </div>
  );
}
