/**
 * A screenshot from public/studio, in the size the screen needs: 960 or 1600 pixels wide.
 */
export default function Shot({
  name, alt, eager = false, className,
}: {
  name: string;
  alt: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={`/studio/${name}-1600.webp`}
      srcSet={`/studio/${name}-960.webp 960w, /studio/${name}-1600.webp 1600w`}
      sizes="(max-width: 900px) 100vw, 60vw"
      alt={alt}
      width={1600}
      height={817}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
