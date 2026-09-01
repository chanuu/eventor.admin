'use client';

import { useState } from 'react';

/**
 * Studio onboarding.
 *
 * Details are collected here, then handed to the admin app to create the
 * account. Account creation needs the Supabase service role key, which lives
 * only on the admin deployment — copying it into this public marketing site
 * would widen the blast radius for no benefit.
 */
export default function OnboardingForm({ adminUrl, plan }: { adminUrl: string; plan: string }) {
  const [studio, setStudio] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);

  const slug = studio.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const ready = studio.trim().length > 1 && name.trim().length > 1 && emailLooksValid;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!ready) return;

    const params = new URLSearchParams({
      studio: studio.trim(),
      name: name.trim(),
      email: email.trim(),
      plan,
    });
    window.location.href = `${adminUrl.replace(/\/$/, '')}/signup?${params}`;
  }

  return (
    <div style={{ background: '#ffffff', padding: 32, boxShadow: '0 24px 50px rgba(17,22,20,0.10)' }}>
      <div style={{ fontSize: 22, fontWeight: 800 }}>Create your studio</div>
      <div style={{ fontSize: 13.5, color: '#6b736e', marginTop: 8, lineHeight: 1.6 }}>
        Tell us about your studio. You will choose a password on the next step.
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
        <Field label="Studio name" hint={slug ? `Your portal will live at /${slug}` : undefined}>
          <input
            value={studio}
            onChange={(e) => setStudio(e.target.value)}
            placeholder="Eventor Studio"
            style={input}
            autoFocus
          />
        </Field>

        <Field label="Your name">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Saman Perera" style={input} />
        </Field>

        <Field
          label="Work email"
          hint={touched && email && !emailLooksValid ? 'Check this email address.' : undefined}
          hintError={touched && !!email && !emailLooksValid}
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="saman@example.com"
            style={input}
            autoComplete="email"
          />
        </Field>

        <button
          type="submit"
          disabled={!ready}
          style={{
            background: ready ? '#0F5344' : '#C4C9C6',
            color: '#ffffff', fontSize: 14, fontWeight: 700, padding: '16px 32px',
            border: 'none', cursor: ready ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
            marginTop: 4,
          }}
        >
          Continue — {plan} plan
        </button>

        <p style={{ fontSize: 11.5, color: '#8b938f', lineHeight: 1.6, margin: 0 }}>
          By continuing you agree to our terms and privacy policy. We will never contact your clients
          without your say-so.
        </p>
      </form>
    </div>
  );
}

function Field({ label, hint, hintError, children }: {
  label: string;
  hint?: string;
  hintError?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#2b332f' }}>
        {label}
      </label>
      {children}
      {hint && (
        <span style={{ fontSize: 11.5, color: hintError ? '#c0533f' : '#8b938f' }}>{hint}</span>
      )}
    </div>
  );
}

const input: React.CSSProperties = {
  border: '1px solid #DEE1DF', background: '#FAFAFA', padding: '14px 16px',
  fontSize: 14, fontFamily: 'inherit', color: '#111614', outline: 'none', width: '100%',
  boxSizing: 'border-box',
};
