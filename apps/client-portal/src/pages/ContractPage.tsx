import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Contract = {
  id: string;
  status: string;
  content_html: string | null;
  signed_at: string | null;
  signature_data: string | null;
};

export default function ContractPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signatureName, setSignatureName] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!jobId) return;
    supabase
      .from('contracts')
      .select('id, status, content_html, signed_at, signature_data')
      .eq('job_id', jobId)
      .maybeSingle()
      .then(({ data }) => {
        setContract(data as Contract | null);
        setLoading(false);
      });
  }, [jobId]);

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!contract || !signatureName.trim()) return;
    setSigning(true);
    setError('');

    const { error: err } = await supabase
      .from('contracts')
      .update({
        status: 'signed',
        signature_data: signatureName.trim(),
        signed_at: new Date().toISOString(),
      })
      .eq('id', contract.id);

    if (err) {
      setError(err.message);
      setSigning(false);
      return;
    }

    navigate(`/jobs/${jobId}`);
  }

  if (loading) return <p style={loadingStyle}>Loading…</p>;

  if (!contract) {
    return (
      <div>
        <Link to={`/jobs/${jobId}`} style={{ fontSize: 13, color: '#6b7280' }}>← Back to job</Link>
        <p style={{ color: '#9ca3af', fontSize: 14, marginTop: 24 }}>No contract has been prepared yet.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link to={`/jobs/${jobId}`} style={{ fontSize: 13, color: '#6b7280' }}>← Back to job</Link>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Contract</h1>
      </div>

      {/* Contract content */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '32px 40px', marginBottom: 20 }}>
        {contract.content_html ? (
          // studio-authored HTML only — not user-controlled
          <div
            style={{ lineHeight: 1.8, fontSize: 14, color: '#374151' }}
            dangerouslySetInnerHTML={{ __html: contract.content_html }}
          />
        ) : (
          <p style={{ color: '#9ca3af', fontSize: 14, fontStyle: 'italic' }}>
            Contract content is being prepared by the studio.
          </p>
        )}
      </div>

      {/* Signature section */}
      {contract.status === 'signed' ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 24 }}>
          <p style={{ fontWeight: 600, color: '#166534', fontSize: 15, marginBottom: 6 }}>Contract signed</p>
          <p style={{ fontSize: 14, color: '#374151' }}>
            Signed by <strong>{contract.signature_data}</strong>
          </p>
          {contract.signed_at && (
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
              {new Date(contract.signed_at).toLocaleString('en-LK', { dateStyle: 'long', timeStyle: 'short' })}
            </p>
          )}
        </div>
      ) : contract.status === 'sent' ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Sign this contract</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
            By typing your full name and clicking "Sign", you confirm you have read and agree to the terms above.
          </p>
          <form onSubmit={handleSign} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>Full name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Type your full name as signature"
                required
                style={{ height: 40, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 14px', fontSize: 15, fontStyle: 'italic' }}
              />
            </div>
            {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
            <div>
              <button
                type="submit"
                disabled={signing || !signatureName.trim()}
                style={{
                  height: 38,
                  borderRadius: 6,
                  background: signatureName.trim() ? '#2563eb' : '#e5e7eb',
                  color: signatureName.trim() ? '#fff' : '#9ca3af',
                  border: 'none',
                  fontWeight: 500,
                  cursor: signatureName.trim() ? 'pointer' : 'not-allowed',
                  padding: '0 24px',
                  fontSize: 14,
                }}
              >
                {signing ? 'Signing…' : 'Sign contract'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>
          Contract status: {contract.status}
        </p>
      )}
    </div>
  );
}

const loadingStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 14, padding: '32px 0' };
