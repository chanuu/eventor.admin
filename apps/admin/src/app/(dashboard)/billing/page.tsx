import { redirect } from 'next/navigation';

/**
 * Billing moved into Settings as a tab. Kept as a redirect because
 * requireFeature() in lib/staff.ts sends people to /billing?locked=… when they
 * hit a feature their plan does not include, and that link is in many places.
 */
export default function BillingRedirect({
  searchParams,
}: {
  searchParams: { locked?: string; saved?: string };
}) {
  const params = new URLSearchParams({ tab: 'billing' });
  if (searchParams.locked) params.set('locked', searchParams.locked);
  if (searchParams.saved) params.set('saved', searchParams.saved);
  redirect(`/settings?${params.toString()}`);
}
