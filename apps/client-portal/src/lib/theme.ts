import type { CSSProperties } from 'react';

/**
 * Design tokens — the Affooh language, matching the studio admin.
 *
 * Magenta running into coral, pure-grey neutrals, generous corners. The portal
 * was deep green with green-tinted greys; the neutrals move too, because a warm
 * grey under a pink accent reads as a mistake rather than a choice.
 *
 * Two keys carried two jobs each in the old palette, and collapsing them is how
 * the admin restyle ended up with a green login screen:
 *
 *   `green` was headings, the dark sidebar, *and* the foreground on lime chips.
 *   `lime`  was the brand accent *and* the success colour.
 *
 * They are separated here. `green` is now simply ink, because the accent is
 * spent on actions and state while headings stay quiet and legible; `lime` is
 * the brand magenta; and success keeps its own green in the `limeSoft*` trio.
 * The old names are retained so the pages need no rewrite, but what they mean
 * is now exactly one thing each.
 */
export const C = {
  /** Brand. `brand` is the flat magenta; `gradient` is the signature sweep. */
  brand: '#E91E78',
  brandDark: '#C8155F',
  coral: '#FB5B3C',
  /** Brand-tinted fill: active nav, accent chips. */
  brandSoft: '#FDE9F2',
  brandSoftStrong: '#FBD2E4',

  /** Headings and dark surfaces. Near-black, never coloured. */
  green: '#111827',
  /** The brand accent. Anything sitting on it takes white, not ink. */
  lime: '#E91E78',

  bg: '#F7F7F9',
  panel: '#FAFAFB',
  white: '#ffffff',

  border: '#ECECEF',
  borderSoft: '#F3F4F6',
  borderBtn: '#E2E3E7',

  text: '#111827',
  textStrong: '#111827',
  textBody: '#374151',
  textMid: '#6B7280',
  muted: '#9CA3AF',

  /** The sidebar is a white rail now, so these are greys, not tints on green. */
  sidebarMuted: '#9CA3AF',
  sidebarText: '#374151',

  due: '#B45309',

  /** Success — kept green, and kept separate from the brand accent. */
  limeSoft: '#DCFCE7',
  limeSoftBorder: '#BBF7D0',
  limeSoftText: '#15803D',

  /** In progress / awaiting action. */
  amberSoft: '#FEF3C7',
  amberText: '#B45309',
  amberBorder: '#FDE68A',

  greySoft: '#F3F4F6',
  greyText: '#6B7280',
  track: '#F3F4F6',
} as const;

/** The signature control: magenta into coral, left to right. */
export const BRAND_GRADIENT = `linear-gradient(90deg, ${C.brand} 0%, ${C.coral} 100%)`;

export const FONT = "Inter, system-ui, sans-serif";

/** Album pages keep their serif — that is editorial, not product chrome. */
export const ALBUM_FONT = "'Cormorant Garamond', Georgia, serif";

export const card: CSSProperties = {
  background: C.white,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: 24,
  // Cards sit on their border rather than on a shadow; the depth is very slight.
  boxShadow: '0 1px 2px rgba(17,24,39,0.04)',
};

export const solidBtn: CSSProperties = {
  background: BRAND_GRADIENT,
  color: C.white,
  border: 'none',
  borderRadius: 10,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 2px 8px rgba(233,30,120,0.22)',
};

export const ghostBtn: CSSProperties = {
  background: C.white,
  color: C.textBody,
  border: `1px solid ${C.borderBtn}`,
  borderRadius: 10,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

/** A tertiary action: brand-tinted rather than filled. */
export const accentBtn: CSSProperties = {
  background: C.brandSoft,
  color: C.brand,
  border: 'none',
  borderRadius: 10,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const sectionTitle: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: C.textStrong,
  letterSpacing: '-0.01em',
};

export const pageTitle: CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  color: C.textStrong,
  letterSpacing: '-0.01em',
};

export const label: CSSProperties = {
  fontSize: 12,
  color: C.muted,
  textTransform: 'uppercase',
  letterSpacing: 1,
  fontWeight: 700,
};

/**
 * Status pill. Softer than the old extra-bold uppercase treatment — at 10.5px
 * with a wide letter-spacing it read as a warning label rather than a status.
 */
export function badge(bg: string, fg: string): CSSProperties {
  return {
    background: bg,
    color: fg,
    fontSize: 12.5,
    fontWeight: 600,
    borderRadius: 8,
    padding: '3px 10px',
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
  };
}

/** Status pill colours, shared by shoots / galleries / payments. */
export function statusBadge(kind: 'done' | 'active' | 'neutral' | 'brand'): CSSProperties {
  if (kind === 'done') return badge(C.limeSoft, C.limeSoftText);
  if (kind === 'active') return badge(C.amberSoft, C.amberText);
  if (kind === 'brand') return badge(C.brandSoft, C.brand);
  return badge(C.greySoft, C.greyText);
}

/** A filled brand tile — the logo mark, an avatar, a step marker. */
export function brandTile(size: number, radius: number | string = 12): CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: radius,
    background: BRAND_GRADIENT,
    color: C.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    fontWeight: 700,
  };
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
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
