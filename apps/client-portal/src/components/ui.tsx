import type { CSSProperties, ReactNode } from 'react';
import { C, card, sectionTitle, label } from '../lib/theme';

/** Every screen fades up on mount, as the design does. */
export function Screen({ children }: { children: ReactNode }) {
  return <div style={{ animation: 'fadeUp 0.4s ease both' }}>{children}</div>;
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...card, ...style }}>{children}</div>;
}

export function CardTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <div style={sectionTitle}>{children}</div>
      {right}
    </div>
  );
}

export function Field({ name, value }: { name: string; value: ReactNode }) {
  return (
    <div>
      <div style={label}>{name}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: C.textStrong, marginTop: 5 }}>{value}</div>
    </div>
  );
}

/**
 * Shown wherever the studio has not entered data yet. The design assumes a fully
 * populated event; this keeps empty states honest rather than inventing content.
 */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: C.white, border: `1px dashed ${C.borderBtn}`, borderRadius: 16,
      padding: 34, textAlign: 'center', fontSize: 12.5, color: C.muted,
    }}>
      {children}
    </div>
  );
}

export function Toast({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: C.green, color: C.white, padding: '12px 20px', borderRadius: 10,
      fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 60,
    }}>
      {message}
    </div>
  );
}

/** Thin progress bar used by payments and proofing. */
export function Bar({ percent, color = C.lime, height = 10 }: { percent: number; color?: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 6, background: C.track, overflow: 'hidden' }}>
      <div style={{ width: `${Math.max(0, Math.min(100, percent))}%`, height: '100%', background: color }} />
    </div>
  );
}
