import type { CSSProperties } from 'react';

/** Design tokens taken from the Customer Portal design. */
export const C = {
  green: '#0F3D2E',
  lime: '#8BC53F',
  bg: '#F6F8F5',
  panel: '#FAFBF9',
  white: '#ffffff',
  border: '#E7EAE5',
  borderSoft: '#EDEFEC',
  borderBtn: '#D8E0DC',
  text: '#16241d',
  textStrong: '#123528',
  textBody: '#3c463f',
  textMid: '#5b6660',
  muted: '#8b968f',
  sidebarMuted: '#8fae9d',
  sidebarText: '#cfe4d8',
  due: '#c2703c',
  limeSoft: '#F1F6EC',
  limeSoftBorder: '#DCE9CE',
  limeSoftText: '#3f6b2b',
  amberSoft: '#FFF3E6',
  amberText: '#a8631f',
  amberBorder: '#F3D9BC',
  greySoft: '#EFF3F6',
  greyText: '#4d6274',
  track: '#EDEFEC',
} as const;

export const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";

export const card: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  padding: 22,
};

export const solidBtn: CSSProperties = {
  background: C.green,
  color: C.white,
  border: 'none',
  borderRadius: 9,
  padding: '10px 16px',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const ghostBtn: CSSProperties = {
  background: C.white,
  color: C.textStrong,
  border: `1px solid ${C.borderBtn}`,
  borderRadius: 9,
  padding: '10px 16px',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const sectionTitle: CSSProperties = { fontSize: 14, fontWeight: 800, color: C.green };

export const label: CSSProperties = {
  fontSize: 11,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 700,
};

export function badge(bg: string, fg: string): CSSProperties {
  return {
    background: bg,
    color: fg,
    fontSize: 10.5,
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    borderRadius: 20,
    padding: '3px 9px',
    whiteSpace: 'nowrap',
  };
}

/** Status pill colours, shared by shoots / galleries / payments. */
export function statusBadge(kind: 'done' | 'active' | 'neutral'): CSSProperties {
  if (kind === 'done') return badge(C.limeSoft, C.limeSoftText);
  if (kind === 'active') return badge(C.amberSoft, C.amberText);
  return badge(C.greySoft, C.greyText);
}

export function dot(bg: string, fg: string, border: string): CSSProperties {
  return {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: bg,
    color: fg,
    border,
    fontSize: 11,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
