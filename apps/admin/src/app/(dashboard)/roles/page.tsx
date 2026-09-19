import { redirect } from 'next/navigation';

/** Roles moved into Settings as a tab; /roles/[roleId] still lives here. */
export default function RolesRedirect({
  searchParams,
}: {
  searchParams: { saved?: string };
}) {
  const params = new URLSearchParams({ tab: 'roles' });
  if (searchParams.saved) params.set('saved', searchParams.saved);
  redirect(`/settings?${params.toString()}`);
}
