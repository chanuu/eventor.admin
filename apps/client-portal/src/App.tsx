import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import AuthCallback from './pages/AuthCallback';
import Layout from './components/Layout';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import ContractPage from './pages/ContractPage';
import GalleryPage from './pages/GalleryPage';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div style={centerStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Check your email</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>We sent a magic link to <strong>{email}</strong></p>
        </div>
      </div>
    );
  }

  return (
    <div style={centerStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Client portal</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Enter your email to access your gallery</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com" required style={inputStyle}
          />
          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div style={{ padding: 32, color: '#9ca3af' }}>Loading…</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/jobs" replace /> : <LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {user ? (
          <Route element={<Layout user={user} />}>
            <Route index element={<Navigate to="/jobs" replace />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/jobs/:jobId/contract" element={<ContractPage />} />
            <Route path="/jobs/:jobId/galleries/:galleryId" element={<GalleryPage />} />
            <Route path="*" element={<Navigate to="/jobs" replace />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

const centerStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardStyle: React.CSSProperties = { width: 360, padding: 32, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' };
const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 };
const btnStyle: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' };
