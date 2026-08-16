import { createClient } from '@/lib/supabase/server';
import ResetPasswordForm from './ResetPasswordForm';

/**
 * Reached from the emailed link, after /auth/callback has exchanged the code
 * for a session. Without that session there is nothing to update, so say so
 * instead of showing a form that will fail on submit.
 */
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div style={wrap}>
        <div style={card}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D2E', marginBottom: 6 }}>
            This link has expired
          </h1>
          <p style={{ color: '#5b6660', fontSize: 13.5, lineHeight: 1.6 }}>
            Password reset links can only be used once, and expire after a short time.
            Request a new one and it will arrive within a minute.
          </p>
          <a href="/forgot-password" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
            Send a new link
          </a>
          <a href="/login" style={{ display: 'block', marginTop: 16, fontSize: 13, color: '#8b968f' }}>
            ← Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return <ResetPasswordForm email={user.email ?? ''} />;
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#F6F8F5', padding: 24,
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: 400, padding: 32, background: '#fff',
  borderRadius: 16, border: '1px solid #E7EAE5',
};
