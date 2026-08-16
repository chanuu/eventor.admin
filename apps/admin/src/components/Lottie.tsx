'use client';

import { useEffect, useRef } from 'react';
import { ANIMATIONS, type AnimationKind } from '@/lib/lottie-data';

/**
 * Renders one of the app's micro-interaction animations.
 *
 * lottie-web is imported dynamically so its ~250 KB stays out of the initial
 * bundle — these are decorative, and a frame or two of delay costs nothing.
 * Respects prefers-reduced-motion by rendering the final frame statically.
 */
export default function Lottie({
  kind, size = 64, loop, className, style,
}: {
  kind: AnimationKind;
  size?: number;
  /** Defaults to looping for empty/loading, single play for success/delete. */
  loop?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let anim: { destroy: () => void; goToAndStop: (v: number, f?: boolean) => void } | null = null;
    let cancelled = false;

    const shouldLoop = loop ?? (kind === 'empty' || kind === 'loading');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    import('lottie-web').then((mod) => {
      if (cancelled || !hostRef.current) return;
      const lottie = mod.default ?? mod;

      anim = lottie.loadAnimation({
        container: hostRef.current,
        renderer: 'svg',
        loop: reduced ? false : shouldLoop,
        autoplay: !reduced,
        animationData: ANIMATIONS[kind] as unknown as Record<string, unknown>,
      }) as any;

      // Show the resolved state rather than nothing when motion is reduced.
      if (reduced && anim) anim.goToAndStop(ANIMATIONS[kind].op - 1, true);
    });

    return () => {
      cancelled = true;
      anim?.destroy();
      if (host) host.innerHTML = '';
    };
  }, [kind, loop]);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={className}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
    />
  );
}
