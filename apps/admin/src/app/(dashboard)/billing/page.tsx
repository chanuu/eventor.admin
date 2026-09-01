import { requireCapability, getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { FEATURE_LABEL, UPGRADE_PROMPT, type Feature } from '@/lib/features';
import PlanCard from './PlanCard';

type PlanRow = {
  key: string;
  name: string;
  price_lkr: number;
  description: string | null;
  sort_order: number;
  plan_features: { feature_key: Feature }[];
};

type FeatureRow = { key: Feature; label: string; description: string | null; sort_order: number };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: { saved?: string; locked?: string };
}) {
  await requireCapability('settings.manage');
  const staff = await getStaff();
  const supabase = createClient();

  const [{ data: plansRaw }, { data: featuresRaw }] = await Promise.all([
    supabase
      .from('plans')
      .select('key, name, price_lkr, description, sort_order, plan_features(feature_key)')
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('features').select('key, label, description, sort_order').order('sort_order'),
  ]);

  const plans = (plansRaw ?? []) as unknown as PlanRow[];
  const allFeatures = (featuresRaw ?? []) as FeatureRow[];
  const current = plans.find((p) => p.key === staff?.planKey) ?? null;
  const locked = searchParams.locked as Feature | undefined;

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 className="page-title">Billing &amp; plan</h1>
      <p className="breadcrumb mb-6">Main Menu / Billing</p>

      {locked && (
        <div className="mb-5 rounded-xl border border-[#F3D9BC] bg-[#FFF3E6] px-4 py-3.5">
          <p className="text-[13px] font-bold text-[#a8631f]">
            {UPGRADE_PROMPT[locked] ?? 'That feature is not part of your plan.'}
          </p>
          <p className="text-[12.5px] text-[#8a6a45] mt-1">
            Choose a plan below that includes {FEATURE_LABEL[locked] ?? 'it'} to switch it on.
          </p>
        </div>
      )}

      {searchParams.saved && (
        <p className="text-[13px] text-green-700 font-semibold mb-4">Plan updated.</p>
      )}

      {/* What the studio has today */}
      <div className="bg-white rounded-2xl border border-line shadow-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="label-xs">Current plan</div>
            <div className="text-xl font-extrabold text-primary mt-1.5">
              {current?.name ?? staff?.planName ?? 'No plan'}
            </div>
            {current && (
              <div className="text-[13px] text-ink-muted mt-1">
                Rs. {current.price_lkr.toLocaleString('en-LK')} / month · {current.description}
              </div>
            )}
          </div>
        </div>

        <div className="h-px bg-line-soft my-5" />

        <div className="label-xs mb-3">What your plan includes</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {allFeatures.map((f) => {
            const on = staff?.features.includes(f.key);
            return (
              <div
                key={f.key}
                className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3
                  ${on ? 'bg-lime-soft border-lime-border' : 'bg-panel border-line-soft'}`}
              >
                <span className={`text-[13px] font-extrabold ${on ? 'text-lime-text' : 'text-ink-muted'}`}>
                  {on ? '✓' : '—'}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[13px] font-semibold ${on ? 'text-ink-strong' : 'text-ink-muted'}`}>
                    {f.label}
                  </span>
                  {f.description && (
                    <span className="block text-[11.5px] text-ink-muted mt-0.5">{f.description}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plans */}
      <h2 className="text-sm font-extrabold text-primary mt-8 mb-1">Change plan</h2>
      <p className="text-[12.5px] text-ink-muted mb-4">
        Switching takes effect immediately. Your data is never deleted when you move to a smaller plan —
        anything outside the new plan simply becomes read-only.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <PlanCard
            key={p.key}
            planKey={p.key}
            name={p.name}
            price={p.price_lkr}
            description={p.description}
            features={p.plan_features.map((f) => f.feature_key)}
            featureLabels={FEATURE_LABEL}
            current={p.key === staff?.planKey}
          />
        ))}
      </div>

      <p className="text-[12px] text-ink-muted mt-5 leading-relaxed">
        Prices are in LKR and billed monthly. No payment provider is connected yet, so changing plan here
        updates your access immediately without taking payment.
      </p>
    </div>
  );
}
