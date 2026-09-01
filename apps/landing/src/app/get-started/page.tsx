import { Suspense } from 'react';
import Link from 'next/link';
import OnboardingForm from '@/components/OnboardingForm';
import { PLANS } from '@/lib/content';

export const metadata = {
  title: 'Get started — Eventor',
  description: 'Create your studio on Eventor and send your first client portal today.',
};

export default function GetStartedPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';
  const selected = PLANS.find((p) => p.name.toLowerCase() === (searchParams.plan ?? '').toLowerCase())
    ?? PLANS[1];

  return (
    <div style={{ background: '#EDEDED', minHeight: '100vh' }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid #E0E0E0', background: '#EDEDEDF2' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <Link href="/" style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5, color: '#111614' }}>
            Ev<span style={{ color: '#8BC53F' }}>e</span>ntor
          </Link>
          <a href={`${adminUrl}/login`} style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#2b332f' }}>
            Sign in
          </a>
        </div>
      </div>

      <div className="pair" style={{ maxWidth: 1160, margin: '0 auto', padding: '64px 32px 96px', display: 'grid', gap: 60, alignItems: 'start' }}>
        {/* Left: what they're signing up for */}
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase', color: '#0F5344' }}>
            Start your studio
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginTop: 16, letterSpacing: -0.6 }}>
            Set up Eventor in a couple of minutes
          </div>
          <div style={{ fontSize: 14.5, color: '#5b6360', lineHeight: 1.75, marginTop: 18 }}>
            You get your own studio workspace, a branded client portal and 14 days free. No card needed to
            start — add billing when you are ready.
          </div>

          <div style={{ background: '#ffffff', padding: 24, marginTop: 30 }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#0F5344' }}>
              {selected.name} plan
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
              <div style={{ fontSize: 30, fontWeight: 800 }}>{selected.price}</div>
              <div style={{ fontSize: 12.5, color: '#8b938f' }}>/ month after the trial</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 18 }}>
              {selected.features.map((f) => (
                <div key={f} style={{ display: 'flex', gap: 9, fontSize: 13, color: '#2b332f' }}>
                  <span style={{ color: '#8BC53F', fontWeight: 800 }}>✓</span><span>{f}</span>
                </div>
              ))}
            </div>
            <Link href="/#pricing" style={{ display: 'inline-block', marginTop: 18, fontSize: 12.5, fontWeight: 700, color: '#0F5344' }}>
              Compare plans →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 26 }}>
            {[
              'Your studio, staff and roles — set up automatically',
              'Client portal ready to send on day one',
              'Cancel any time; export your data whenever you like',
            ].map((t) => (
              <div key={t} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#2b332f' }}>
                <span style={{ color: '#0F5344', fontWeight: 800 }}>✓</span><span>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: the form */}
        <Suspense fallback={null}>
          <OnboardingForm adminUrl={adminUrl} plan={selected.name} />
        </Suspense>
      </div>
    </div>
  );
}
