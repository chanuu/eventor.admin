import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { C, FONT } from '../lib/theme';
import { toE164, isValidLkMobile, prettyPhone } from '../lib/phone';

const RESEND_SECONDS = 60;

export default function LoginPage() {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');

    if (!isValidLkMobile(phone)) {
      setError('Enter a valid mobile number, for example 077 123 4567.');
      return;
    }

    setLoading(true);

    // Check the number belongs to a client before spending an SMS on it.
    const { data: known, error: checkErr } = await supabase.rpc('client_phone_exists', { raw_phone: phone });
    if (checkErr) {
      setLoading(false);
      setError('We could not reach the server. Please try again.');
      return;
    }
    if (!known) {
      setLoading(false);
      setError('We don’t recognise this number. Please check it, or contact your studio to get access.');
      return;
    }

    const { error: otpErr } = await supabase.auth.signInWithOtp({ phone: toE164(phone) });
    setLoading(false);

    if (otpErr) { setError(otpErr.message); return; }

    setStep('code');
    setCooldown(RESEND_SECONDS);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.trim().length < 4) { setError('Enter the code from the SMS.'); return; }

    setLoading(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: code.trim(),
      type: 'sms',
    });
    setLoading(false);

    if (verifyErr) {
      setError(verifyErr.message.toLowerCase().includes('expired')
        ? 'That code has expired. Request a new one.'
        : 'That code is not correct. Please check and try again.');
      return;
    }
    // Signed in — App swaps to the portal on the auth state change.
  }

  return (
    <div style={wrap}>
      <div style={cardStyle}>
        <div style={logoMark}>E</div>
        <h1 style={title}>Client portal</h1>

        {step === 'phone' ? (
          <>
            <p style={sub}>Enter your mobile number and we’ll text you a code to sign in.</p>
            <form onSubmit={sendCode} style={form}>
              <label style={fieldLabel}>Mobile number</label>
              <div style={phoneRow}>
                <span style={prefix}>+94</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="077 123 4567"
                  autoFocus
                  style={phoneInput}
                />
              </div>
              {error && <p style={errorText}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryBtn(!loading)}>
                {loading ? 'Sending…' : 'Send code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={sub}>
              We sent a 6-digit code to <strong style={{ color: C.textStrong }}>{prettyPhone(phone)}</strong>.
            </p>
            <form onSubmit={verify} style={form}>
              <label style={fieldLabel}>Verification code</label>
              <input
                ref={codeRef}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="——————"
                style={codeInput}
              />
              {error && <p style={errorText}>{error}</p>}
              <button type="submit" disabled={loading} style={primaryBtn(!loading)}>
                {loading ? 'Verifying…' : 'Sign in'}
              </button>

              <div style={footerRow}>
                <button
                  type="button"
                  onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                  style={linkBtn}
                >
                  Change number
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || loading}
                  onClick={() => sendCode()}
                  style={{ ...linkBtn, opacity: cooldown > 0 ? 0.45 : 1, cursor: cooldown > 0 ? 'default' : 'pointer' }}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: C.bg, fontFamily: FONT, padding: 24,
};

const cardStyle: React.CSSProperties = {
  width: 400, padding: 36, background: C.white, borderRadius: 16, border: `1px solid ${C.border}`,
  boxShadow: '0 8px 24px rgba(15,61,46,0.06)',
};

const logoMark: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 11, background: C.lime, color: C.green,
  fontWeight: 800, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const title: React.CSSProperties = { fontSize: 19, fontWeight: 800, color: C.green, marginTop: 16 };
const sub: React.CSSProperties = { fontSize: 13, color: C.textMid, marginTop: 6, lineHeight: 1.6 };
const form: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 };
const fieldLabel: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: C.textStrong };

const phoneRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', border: `1px solid ${C.borderBtn}`,
  borderRadius: 9, overflow: 'hidden', background: C.white,
};

const prefix: React.CSSProperties = {
  padding: '0 12px', height: 44, display: 'flex', alignItems: 'center',
  background: C.panel, borderRight: `1px solid ${C.borderBtn}`,
  fontSize: 14, fontWeight: 700, color: C.textMid,
};

const phoneInput: React.CSSProperties = {
  flex: 1, height: 44, border: 'none', outline: 'none', padding: '0 14px',
  fontSize: 15, fontFamily: 'inherit', color: C.textStrong, letterSpacing: 0.5,
};

const codeInput: React.CSSProperties = {
  height: 52, border: `1px solid ${C.borderBtn}`, borderRadius: 9, outline: 'none',
  padding: '0 16px', fontSize: 24, fontFamily: 'inherit', color: C.textStrong,
  letterSpacing: 8, textAlign: 'center', fontWeight: 700,
};

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    height: 44, borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13,
    fontFamily: 'inherit', marginTop: 4,
    cursor: enabled ? 'pointer' : 'not-allowed',
    background: enabled ? C.green : '#DDE3DE',
    color: enabled ? C.white : C.muted,
  };
}

const errorText: React.CSSProperties = { fontSize: 12.5, color: '#dc2626', lineHeight: 1.5 };

const footerRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
};

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: C.textMid, fontSize: 12.5,
  fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0,
};
