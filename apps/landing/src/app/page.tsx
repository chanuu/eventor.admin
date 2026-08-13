export default function LandingPage() {
  return (
    <main>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 48px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Eventor</span>
        <a
          href={process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001'}
          style={{ background: '#2563eb', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14, fontWeight: 500 }}
        >
          Sign in
        </a>
      </nav>

      <section style={{ textAlign: 'center', padding: '96px 24px 64px' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, marginBottom: 20 }}>
          Photography studio management<br />built for Sri Lanka
        </h1>
        <p style={{ fontSize: 18, color: '#6b7280', maxWidth: 540, margin: '0 auto 36px' }}>
          Handle jobs, clients, shoots, galleries, contracts, and payments — all in one platform. Billed in LKR.
        </p>
        <a
          href={process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001'}
          style={{ background: '#2563eb', color: '#fff', padding: '12px 32px', borderRadius: 8, fontSize: 16, fontWeight: 600, display: 'inline-block' }}
        >
          Get started
        </a>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 960, margin: '0 auto', padding: '0 24px 96px' }}>
        {FEATURES.map((f) => (
          <div key={f.title} style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 8 }}>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>{f.desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}

const FEATURES = [
  { title: 'Job & shoot management', desc: 'Track every job from lead to delivery with full shoot scheduling.' },
  { title: 'Client proofing galleries', desc: 'Let clients select photos online before final delivery.' },
  { title: 'Contracts & payments', desc: 'Digital signing and PayHere integration for LKR payments.' },
  { title: 'Staff roles', desc: 'Admin, editor, sales, and coordinator roles with scoped access.' },
  { title: 'Branded client portal', desc: 'Each studio gets its own subdomain for client-facing pages.' },
  { title: 'Flipbook delivery', desc: 'Share finished albums as beautiful digital flipbooks.' },
];
