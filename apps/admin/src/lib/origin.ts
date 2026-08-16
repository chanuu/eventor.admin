import { headers } from 'next/headers';

/**
 * Absolute origin of the running app, for links sent by email.
 *
 * Prefers NEXT_PUBLIC_APP_URL when configured, but falls back to the incoming
 * request headers so password-reset links keep working on any deploy where that
 * variable was forgotten — previously a missing value produced links pointing at
 * "undefined/auth/callback".
 */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured && !configured.includes('undefined')) return configured;

  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host');
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https');

  return host ? `${proto}://${host}` : 'http://localhost:3001';
}
