'use client';

import { useEffect, useRef, useState } from 'react';
import { HERO_SLIDES, IMG } from '@/lib/content';

/**
 * Hero slider. Advances every 7 seconds until the visitor takes control, at
 * which point it stops rather than fighting them — as in the design.
 */
export default function Hero({ signInHref }: { signInHref: string }) {
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!paused.current) setIndex((i) => (i + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  function goTo(i: number) {
    paused.current = true;
    setIndex((i + HERO_SLIDES.length) % HERO_SLIDES.length);
  }

  const slide = HERO_SLIDES[index];

  return (
    <div style={{ position: 'relative', background: '#EDEDED', minHeight: 620, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      {/* Cross-fading image stack, masked into the copy on the left */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '64%' }}>
        {HERO_SLIDES.map((s, i) => (
          <div
            key={s.key}
            style={{
              position: 'absolute', inset: 0,
              backgroundImage: `url(${s.url ?? IMG(s.image!, 1600)})`,
              backgroundSize: 'cover',
              backgroundPosition: s.pos,
              filter: s.color ? 'none' : 'grayscale(1) contrast(1.05)',
              transition: 'opacity 0.9s ease',
              opacity: i === index ? 1 : 0,
            }}
          />
        ))}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#EDEDED 0%,rgba(237,237,237,0.86) 24%,rgba(237,237,237,0) 58%)' }} />
      </div>

      <div style={{ position: 'relative', maxWidth: 1160, margin: '0 auto', padding: '86px 32px 74px', width: '100%', boxSizing: 'border-box' }}>
        <div key={slide.key} style={{ maxWidth: 560, animation: 'riseIn 0.6s ease both' }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase', color: '#0F5344' }}>
            {slide.kicker}
          </div>
          <div style={{ fontSize: 'clamp(34px,4.4vw,54px)', fontWeight: 800, lineHeight: 1.1, marginTop: 20, letterSpacing: -1 }}>
            {slide.titleA} <span style={{ color: '#0F5344' }}>{slide.titleAccent}</span><br />{slide.titleB}
          </div>
          <div style={{ fontSize: 15.5, color: '#4c554f', lineHeight: 1.7, marginTop: 18, maxWidth: 460 }}>
            {slide.body}
          </div>

          {slide.chips && (
            <div style={{ display: 'flex', gap: 9, marginTop: 22, flexWrap: 'wrap' }}>
              {slide.chips.map((c) => (
                <div key={c} style={{ background: '#ffffff', border: '1px solid #DEE1DF', fontSize: 12, fontWeight: 600, color: '#2b332f', padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  {c}
                </div>
              ))}
            </div>
          )}

          {slide.koko && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 24, background: '#ffffff', border: '1px solid #DEE1DF', padding: '16px 20px', maxWidth: 430, flexWrap: 'wrap' }}>
              <div style={{ background: '#111614', color: '#ffffff', fontSize: 13, fontWeight: 800, letterSpacing: 0.5, padding: '8px 14px' }}>koko</div>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>3 × Rs. 50,000 interest free</div>
                <div style={{ fontSize: 11.5, color: '#6b736e', marginTop: 2 }}>On a Rs. 150,000 wedding package</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 14, marginTop: 30, flexWrap: 'wrap' }}>
            <a href={slide.key === 'album' ? signInHref : slide.ctaHref} style={{ background: '#0F5344', color: '#ffffff', fontSize: 14, fontWeight: 600, padding: '16px 32px' }}>
              {slide.cta}
            </a>
            <a href={slide.altHref} style={{ border: '1px solid #B9BEBB', color: '#111614', fontSize: 14, fontWeight: 600, padding: '16px 32px' }}>
              {slide.alt}
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 22, marginTop: 44, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 9 }}>
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.key}
                onClick={() => goTo(i)}
                title={s.label}
                aria-label={s.label}
                style={{
                  width: i === index ? 30 : 10, height: 10, border: 'none', padding: 0, cursor: 'pointer',
                  transition: 'width 0.3s ease, background 0.3s ease',
                  background: i === index ? '#0F5344' : '#C4C9C6',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => goTo(index - 1)} aria-label="Previous" style={arrow}>‹</button>
            <button onClick={() => goTo(index + 1)} aria-label="Next" style={arrow}>›</button>
          </div>
          <div style={{ fontSize: 12, color: '#6b736e', letterSpacing: 0.5 }}>{slide.label}</div>
        </div>
      </div>
    </div>
  );
}

const arrow: React.CSSProperties = {
  width: 38, height: 38, border: '1px solid #B9BEBB', background: 'transparent',
  color: '#111614', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
};
