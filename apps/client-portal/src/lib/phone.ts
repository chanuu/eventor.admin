/**
 * Sri Lankan mobile numbers.
 *
 * Studios type them locally (0771234567 / 077 123 4567) while Supabase requires
 * E.164 (+94771234567), so everything is reduced to the 9 significant digits —
 * the same rule the database uses in normalize_phone().
 */

const LK_COUNTRY_CODE = '94';

/** The 9 significant digits, or null if the input can't be one. */
export function significantDigits(raw: string): string | null {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

/** A Sri Lankan mobile is 9 significant digits starting with 7. */
export function isValidLkMobile(raw: string): boolean {
  const sig = significantDigits(raw);
  return !!sig && sig.startsWith('7');
}

/** "077 123 4567" → "+94771234567" */
export function toE164(raw: string): string {
  const sig = significantDigits(raw);
  return sig ? `+${LK_COUNTRY_CODE}${sig}` : raw;
}

/** "0771234567" → "+94 77 123 4567" for display back to the user. */
export function prettyPhone(raw: string): string {
  const sig = significantDigits(raw);
  if (!sig) return raw;
  return `+${LK_COUNTRY_CODE} ${sig.slice(0, 2)} ${sig.slice(2, 5)} ${sig.slice(5)}`;
}
