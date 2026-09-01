import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import JobPageClient, { type JobData } from './JobPageClient';

// ─── Raw DB type ──────────────────────────────────────────────────────────────

type JobFull = {
  id: string;
  studio_id: string;
  title: string;
  event_type: string | null;
  lead_source: string | null;
  status: string;
  total_price: number;
  notes: string | null;
  package_id: string | null;
  clients: { id: string; full_name: string } | null;
  packages: {
    name: string;
    base_price: number;
    shoots_included: number;
    package_addons: { id: string; name: string; price: number; is_active: boolean }[];
  } | null;
  job_addons: {
    id: string;
    price_at_booking: number;
    quantity: number;
    package_addons: { name: string } | null;
  }[];
  shoots:   { id: string; shoot_type: string | null; scheduled_at: string | null; venue: string | null; status: string }[];
  payments: { id: string; type: string; amount: number; method: string; status: string; paid_at: string | null; notes: string | null }[];
  contracts: { id: string; status: string; sent_at: string | null; signed_at: string | null; signature_data: string | null }[];
};

// ─── Page ─────────────────────────────────────────────────────────────────────

/** A to-one embed arrives as an object; older code assumed an array. */
function oneOf<T>(raw: unknown): T | null {
  if (!raw) return null;
  return ((Array.isArray(raw) ? raw[0] : raw) as T) ?? null;
}

export default async function JobDetailPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { tab?: string; saved?: string };
}) {
  const supabase = createClient();

  const { data: raw } = await supabase
    .from('jobs')
    .select(`
      id, studio_id, title, event_type, lead_source, status, total_price, notes, package_id,
      clients(id, full_name),
      packages(name, base_price, shoots_included, package_addons(id, name, price, is_active)),
      job_addons(id, price_at_booking, quantity, package_addons(name)),
      shoots(id, shoot_type, scheduled_at, venue, status),
      payments(id, type, amount, method, status, paid_at, notes),
      contracts(id, status, sent_at, signed_at, signature_data)
    `)
    .eq('id', params.id)
    .single();

  if (!raw) notFound();
  const full = raw as unknown as JobFull;

  const pkg    = full.packages as JobFull['packages'];
  const client = full.clients  as { id: string; full_name: string } | null;

  const shoots = [...(full.shoots ?? [])].sort((a, b) => {
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return a.scheduled_at.localeCompare(b.scheduled_at);
  });

  const jobAddons = (full.job_addons ?? []).map((ja) => ({
    id:               ja.id,
    price_at_booking: ja.price_at_booking,
    quantity:         ja.quantity,
    addonName:        (ja.package_addons as { name: string } | null)?.name ?? 'Add-on',
  }));

  const availableAddons = (pkg?.package_addons ?? [])
    .filter((a) => a.is_active)
    .map(({ id, name, price }) => ({ id, name, price }));

  const initialData: JobData = {
    title:           full.title,
    eventType:       full.event_type,
    leadSource:      full.lead_source,
    status:          full.status,
    totalPrice:      full.total_price,
    notes:           full.notes,
    clientName:      client?.full_name ?? null,
    pkg:             pkg ? { name: pkg.name, base_price: pkg.base_price, shoots_included: pkg.shoots_included } : null,
    jobAddons,
    availableAddons,
    shoots,
    payments:        (full.payments ?? []) as JobData['payments'],
    contract:        oneOf<any>(full.contracts),
  };
  const { data: leadSourcesRaw } = await supabase
    .from('lead_sources')
    .select('name')
    .eq('is_active', true)
    .order('sort_order');
  const leadSources = ((leadSourcesRaw ?? []) as { name: string }[]).map((r) => r.name);


  return (
    <JobPageClient
      jobId={full.id}
      studioId={full.studio_id}
      initialData={initialData}
      initialTab={searchParams.tab ?? 'details'}
      savedParam={!!searchParams.saved}
      leadSources={leadSources}
    />
  );
}
