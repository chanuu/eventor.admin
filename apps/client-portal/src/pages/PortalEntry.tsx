import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { fetchJobOptions } from '../lib/portal';
import { C } from '../lib/theme';

/**
 * Clients land here after login. The design is a single-event portal, so we send
 * them straight into their most recent event; the sidebar offers a switcher when
 * there is more than one.
 */
export default function PortalEntry() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobOptions().then((opts) => {
      setJobId(opts[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={wrap}>Loading your portal…</div>;
  if (!jobId) {
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.green }}>No events yet</div>
          <p style={{ marginTop: 8, lineHeight: 1.6 }}>
            Your studio hasn’t linked an event to this mobile number yet. Once they do, it appears here automatically.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to={`/portal/${jobId}/overview`} replace />;
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', background: C.bg, color: C.muted, fontSize: 13,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32,
};
