import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/platform';
import { createClient } from '@/lib/supabase/server';
import PlanEditor from './PlanEditor';
import NewPlanForm from './NewPlanForm';

type PlanRow = {
  key: string; name: string; price_lkr: number; description: string | null;
  sort_order: number; is_active: boolean;
  plan_features: { feature_key: string }[];
};

type FeatureRow = { key: string; label: string; description: string | null };

export default async function PlatformPlansPage() {
  await requirePlatformAdmin();
  const supabase = createClient();

  const [{ data: plansRaw }, { data: featuresRaw }, { data: subsRaw }] = await Promise.all([
    supabase
      .from('plans')
      .select('key, name, price_lkr, description, sort_order, is_active, plan_features(feature_key)')
      .order('sort_order'),
    supabase.from('features').select('key, label, description').order('sort_order'),
    supabase.from('subscriptions').select('plan_key').eq('status', 'active'),
  ]);

  const plans = (plansRaw ?? []) as unknown as PlanRow[];
  const allFeatures = (featuresRaw ?? []) as FeatureRow[];

  const subscribers: Record<string, number> = {};
  ((subsRaw ?? []) as { plan_key: string | null }[]).forEach(({ plan_key }) => {
    if (plan_key) subscribers[plan_key] = (subscribers[plan_key] ?? 0) + 1;
  });

  return (
    <div style={{ maxWidth: 1000 }}>
      <Link href="/platform" className="text-[13px] text-ink-muted">← Platform</Link>
      <h1 className="page-title mt-2">Package configuration</h1>
      <p className="breadcrumb mb-6">
        Prices and included features for every package offered on Eventor.
      </p>

      <div className="flex flex-col gap-4">
        {plans.map((p) => (
          <PlanEditor
            key={p.key}
            planKey={p.key}
            name={p.name}
            price={p.price_lkr}
            description={p.description}
            isActive={p.is_active}
            features={p.plan_features.map((f) => f.feature_key)}
            allFeatures={allFeatures}
            subscriberCount={subscribers[p.key] ?? 0}
          />
        ))}
      </div>

      {/* New package */}
      <div className="bg-white rounded-2xl border border-line shadow-card p-6 mt-4">
        <h2 className="text-sm font-extrabold text-primary">New package</h2>
        <p className="text-[12.5px] text-ink-muted mt-1 mb-4">
          Created hidden from new studios — pick its features and tick “Offered to new studios” when it is ready.
        </p>
        <NewPlanForm />
      </div>
    </div>
  );
}
