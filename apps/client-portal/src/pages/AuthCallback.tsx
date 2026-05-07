import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase automatically processes the hash/code on client init.
    // We just wait for the session to resolve via getSession().
    supabase.auth.getSession().then(({ data: { session }, error: err }) => {
      if (err) { setError(err.message); return; }
      if (session) navigate('/', { replace: true });
      else setError('Invalid or expired link. Please request a new one.');
    });
  }, [navigate]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <a href="/login" style={{ color: '#2563eb', fontSize: 14 }}>Request a new link</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#6b7280' }}>Signing you in…</p>
    </div>
  );
}
