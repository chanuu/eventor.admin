'use client';

import { useState } from 'react';
import { signIn } from './actions';

export default function LoginPage() {
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [remember, setRemember]     = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      padding: 24,
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 880,
        minHeight: 580,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 48px rgba(0,0,0,0.10)',
        overflow: 'hidden',
      }}>

        {/* ── Left: form ── */}
        <div style={{
          flex: 1,
          padding: '52px 52px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>

          {/* Logo */}
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <img src="/logo.png" alt="Eventor" style={{ height: 44, objectFit: 'contain' }} />
          </div>

          {/* Subtitle */}
          <p style={{
            fontSize: 13,
            color: '#6b7280',
            textAlign: 'center',
            marginBottom: 28,
            lineHeight: 1.6,
          }}>
            Welcome to the Eventor Portal. Sign in to<br />access your account.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Email */}
            <input
              name="email"
              type="email"
              placeholder="Email"
              required
              autoComplete="email"
              style={{
                height: 46,
                borderRadius: 8,
                border: '1px solid #c8e6a0',
                padding: '0 14px',
                fontSize: 14,
                color: '#374151',
                outline: 'none',
                width: '100%',
                boxSizing: 'border-box',
                background: '#fff',
              }}
            />

            {/* Password */}
            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Password"
                required
                autoComplete="current-password"
                style={{
                  height: 46,
                  borderRadius: 8,
                  border: '1px solid #c8e6a0',
                  padding: '0 44px 0 14px',
                  fontSize: 14,
                  color: '#374151',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#A2CD34',
                }}
              >
                {showPwd ? <EyeOff /> : <EyeOn />}
              </button>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
            )}

            {/* Sign In */}
            <button
              type="submit"
              disabled={loading}
              style={{
                height: 46,
                borderRadius: 8,
                background: '#A2CD34',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
                marginTop: 2,
                letterSpacing: '0.01em',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>

            {/* Remember Me + Forgot */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 13, color: '#374151', cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: '#A2CD34', cursor: 'pointer' }}
                />
                Remember Me
              </label>
              <a href="/forgot-password" style={{ fontSize: 13, color: '#374151', textDecoration: 'none' }}>
                Forgot your Password?
              </a>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
              <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>Or sign in using</span>
              <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
            </div>

            {/* Google */}
            <button
              type="button"
              style={{
                height: 46,
                borderRadius: 8,
                background: '#fff',
                color: '#374151',
                border: '1px solid #e5e7eb',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <GoogleIcon />
              Continue with Google
            </button>

          </form>

          {/* Copyright */}
          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 32 }}>
            Copyright © 2024. All rights reserved.{' '}
            <a href="/terms"   style={{ color: '#9ca3af' }}>terms</a>{' '}
            &amp;{' '}
            <a href="/privacy" style={{ color: '#9ca3af' }}>privacy policy</a>
          </p>
        </div>

        {/* ── Right: image panel ── */}
        <div style={{
          width: 320,
          margin: 16,
          borderRadius: 16,
          background: 'linear-gradient(175deg, #6b8f5e 0%, #3a4f35 55%, #2a3a28 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '32px 28px',
          flexShrink: 0,
        }}>
          {/* Decorative circles to mimic the photo bokeh/depth */}
          <div style={{
            position: 'absolute', top: -60, right: -60,
            width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
          }} />
          <div style={{
            position: 'absolute', top: 80, left: -40,
            width: 160, height: 160, borderRadius: '50%',
            background: 'rgba(162,205,52,0.10)',
          }} />

          <p style={{
            fontSize: 28,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35,
            margin: 0,
            position: 'relative',
            zIndex: 1,
          }}>
            Transform<br />
            Your Ideas into<br />
            Reality Today!
          </p>
        </div>

      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function EyeOn() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
