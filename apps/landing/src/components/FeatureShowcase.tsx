'use client';

import { useState } from 'react';
import { FEATURES, T } from '@/lib/content';

/**
 * Tabbed tour of the product.
 *
 * Every panel is a real screenshot in a browser frame, because a studio
 * deciding whether to move wants to see the actual screens, not an
 * illustration of them.
 *
 * All panels stay mounted and are hidden rather than unmounted, so the images
 * are fetched once and switching tabs is instant — the first tab's image is
 * eager, the rest lazy.
 */
export default function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const feature = FEATURES[active];

  return (
    <section id="tour" style={{ background: T.white, padding: '96px 28px' }}>
      <div style={{ maxWidth: 1160, margin: '0 auto' }}>
        <h2
          style={{
            fontSize: 'clamp(30px, 4vw, 46px)', fontWeight: 800, letterSpacing: '-0.03em',
            lineHeight: 1.12, color: T.ink, textAlign: 'center', margin: 0, maxWidth: 820,
            marginInline: 'auto',
          }}
        >
          Stop stitching it together — book, shoot and deliver in one place.
        </h2>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Product tour"
          style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 36,
          }}
        >
          {FEATURES.map((f, i) => {
            const on = i === active;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={on}
                aria-controls={`panel-${f.key}`}
                id={`tab-${f.key}`}
                onClick={() => setActive(i)}
                style={{
                  background: on ? T.gradient : T.white,
                  color: on ? T.white : T.body,
                  border: on ? '1px solid transparent' : `1px solid ${T.line}`,
                  borderRadius: 999, padding: '11px 22px',
                  fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: on ? '0 4px 14px rgba(233,30,120,0.28)' : 'none',
                  transition: 'background 200ms ease, color 200ms ease',
                }}
              >
                {f.tab}
              </button>
            );
          })}
        </div>

        {/* Panel */}
        <div
          className="split-115"
          id={`panel-${feature.key}`}
          role="tabpanel"
          aria-labelledby={`tab-${feature.key}`}
          style={{ display: 'grid', gap: 48, alignItems: 'center', marginTop: 48 }}
        >
          {/* Browser mock */}
          <div
            style={{
              background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
              overflow: 'hidden', boxShadow: '0 18px 50px rgba(17,24,39,0.12)',
            }}
          >
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: T.panel, borderBottom: `1px solid ${T.line}`, padding: '11px 14px',
              }}
            >
              {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
              ))}
              <span
                style={{
                  flex: 1, marginLeft: 8, background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 7, padding: '5px 11px',
                  fontSize: 12.5, color: T.mid,
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                {feature.url}
              </span>
            </div>

            {/*
              The frame matches the screenshots' own ratio (~1.83:1) and the
              images are contained, so nothing is cropped — a 16/10 frame with
              cover cut the right-hand column off every screen.

              All panels stay mounted and are faded, so switching never refetches.
            */}
            <div style={{ position: 'relative', aspectRatio: '1620 / 885', background: T.canvas }}>
              {FEATURES.map((f, i) => (
                <img
                  key={f.key}
                  src={f.image}
                  alt={`Eventor — ${f.heading}`}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'contain', objectPosition: 'top left',
                    opacity: i === active ? 1 : 0,
                    transition: 'opacity 260ms ease',
                    pointerEvents: 'none',
                  }}
                />
              ))}
            </div>
          </div>

          {/* What it does */}
          <div>
            <span
              style={{
                display: 'grid', placeItems: 'center', width: 46, height: 46,
                borderRadius: 13, background: T.tint, color: T.brand, marginBottom: 20,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>

            <h3
              style={{
                fontSize: 'clamp(24px, 2.8vw, 32px)', fontWeight: 800, letterSpacing: '-0.025em',
                lineHeight: 1.2, color: T.ink, margin: 0,
              }}
            >
              {feature.heading}
            </h3>

            <p style={{ fontSize: 16, lineHeight: 1.75, color: T.mid, margin: '16px 0 0' }}>
              {feature.body}
            </p>

            <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {feature.points.map((p) => (
                <li key={p} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span
                    style={{
                      display: 'grid', placeItems: 'center', flexShrink: 0,
                      width: 22, height: 22, borderRadius: 7,
                      background: '#DCFCE7', color: '#15803D', marginTop: 1,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12 5 5L20 7" />
                    </svg>
                  </span>
                  <span style={{ fontSize: 15.5, color: T.body, lineHeight: 1.6 }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
