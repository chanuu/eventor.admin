import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Job = {
  id: string;
  title: string;
  event_type: string | null;
  status: string;
  total_price: number;
  packages: { name: string; shoots_included: number } | null;
};

type Contract = { id: string; status: string; signed_at: string | null };
type Shoot = { id: string; shoot_type: string | null; scheduled_at: string | null; venue: string | null; status: string };
type Payment = { id: string; type: string; amount: number; method: string; status: string; paid_at: string | null };
type Gallery = { id: string; title: string; status: string; selection_deadline: string | null };
type Flipbook = { id: string; share_token: string; published_at: string | null };

const SHOOT_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  scheduled: { bg: '#dbeafe', color: '#1e40af' },
  shot:      { bg: '#fef3c7', color: '#92400e' },
  editing:   { bg: '#ede9fe', color: '#5b21b6' },
  done:      { bg: '#dcfce7', color: '#166534' },
};

const JOB_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280' },
  quoted:     { bg: '#fef3c7', color: '#92400e' },
  contracted: { bg: '#dbeafe', color: '#1e40af' },
  active:     { bg: '#dcfce7', color: '#166534' },
  editing:    { bg: '#ede9fe', color: '#5b21b6' },
  proofing:   { bg: '#fce7f3', color: '#9d174d' },
  delivered:  { bg: '#d1fae5', color: '#065f46' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af' },
};

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [shoots, setShoots] = useState<Shoot[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [flipbook, setFlipbook] = useState<Flipbook | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    Promise.all([
      supabase
        .from('jobs')
        .select('id, title, event_type, status, total_price, packages(name, shoots_included)')
        .eq('id', jobId)
        .single(),
      supabase
        .from('contracts')
        .select('id, status, signed_at')
        .eq('job_id', jobId)
        .maybeSingle(),
      supabase
        .from('shoots')
        .select('id, shoot_type, scheduled_at, venue, status')
        .eq('job_id', jobId)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('payments')
        .select('id, type, amount, method, status, paid_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true }),
      supabase
        .from('galleries')
        .select('id, title, status, selection_deadline')
        .eq('job_id', jobId)
        .neq('status', 'hidden')
        .order('created_at', { ascending: true }),
      supabase
        .from('flipbooks')
        .select('id, share_token, published_at')
        .eq('job_id', jobId)
        .not('published_at', 'is', null)
        .maybeSingle(),
    ]).then(([jobRes, contractRes, shootsRes, paymentsRes, galleriesRes, flipbookRes]) => {
      setJob(jobRes.data as unknown as Job | null);
      setContract(contractRes.data as Contract | null);
      setShoots((shootsRes.data ?? []) as Shoot[]);
      setPayments((paymentsRes.data ?? []) as Payment[]);
      setGalleries((galleriesRes.data ?? []) as Gallery[]);
      setFlipbook(flipbookRes.data as Flipbook | null);
      setLoading(false);
    });
  }, [jobId]);

  if (loading) return <p style={loadingStyle}>Loading…</p>;
  if (!job) return <p style={{ color: '#dc2626', fontSize: 14 }}>Job not found.</p>;

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const balanceDue = job.total_price - totalPaid;
  const pkg = job.packages as { name: string; shoots_included: number } | null;
  const jobBadge = JOB_STATUS_COLORS[job.status] ?? JOB_STATUS_COLORS.lead;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link to="/jobs" style={{ fontSize: 13, color: '#6b7280' }}>← All jobs</Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{job.title}</h1>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: jobBadge.bg, color: jobBadge.color, textTransform: 'capitalize' }}>
            {job.status}
          </span>
        </div>
        {job.event_type && <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{job.event_type}</p>}
        {pkg && <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{pkg.name}</p>}
      </div>

      {/* Contract */}
      {contract && contract.status !== 'draft' && (
        <Section title="Contract">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              {contract.status === 'signed' ? (
                <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
                  ✓ Signed{contract.signed_at ? ` · ${new Date(contract.signed_at).toLocaleDateString('en-LK')}` : ''}
                </span>
              ) : contract.status === 'sent' ? (
                <span style={{ fontSize: 13, color: '#92400e', fontWeight: 500 }}>Awaiting your signature</span>
              ) : (
                <span style={{ fontSize: 13, color: '#9ca3af' }}>Contract pending</span>
              )}
            </div>
            <Link
              to={`/jobs/${jobId}/contract`}
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: contract.status === 'sent' ? '#fff' : '#2563eb',
                background: contract.status === 'sent' ? '#2563eb' : 'transparent',
                padding: contract.status === 'sent' ? '6px 14px' : '0',
                borderRadius: 6,
                textDecoration: 'none',
              }}
            >
              {contract.status === 'sent' ? 'Review & sign →' : 'View contract'}
            </Link>
          </div>
        </Section>
      )}

      {/* Shoots */}
      {shoots.length > 0 && (
        <Section title="Shoots">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {shoots.map((shoot) => {
              const sb = SHOOT_STATUS_COLORS[shoot.status] ?? SHOOT_STATUS_COLORS.scheduled;
              return (
                <div key={shoot.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{shoot.shoot_type ?? 'Shoot'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                      {shoot.scheduled_at
                        ? new Date(shoot.scheduled_at).toLocaleString('en-LK', { dateStyle: 'full', timeStyle: 'short' })
                        : 'Date to be confirmed'}
                    </div>
                    {shoot.venue && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>📍 {shoot.venue}</div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 8, background: sb.bg, color: sb.color, whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                    {shoot.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Galleries */}
      {galleries.length > 0 && (
        <Section title="Galleries">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {galleries.map((g) => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{g.title}</div>
                  {g.status === 'proofing' && g.selection_deadline && (
                    <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 2 }}>
                      Select favourites by {new Date(g.selection_deadline).toLocaleDateString('en-LK', { dateStyle: 'long' })}
                    </div>
                  )}
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: g.status === 'proofing' ? '#fce7f3' : '#dcfce7',
                  color: g.status === 'proofing' ? '#9d174d' : '#065f46',
                  textTransform: 'capitalize',
                }}>
                  {g.status}
                </span>
                <Link
                  to={`/jobs/${jobId}/galleries/${g.id}`}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: g.status === 'proofing' ? '#2563eb' : '#6b7280',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.status === 'proofing' ? 'Select photos →' : 'View gallery'}
                </Link>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Payments */}
      <Section title="Payments">
        <div style={{ display: 'flex', gap: 28, marginBottom: 16, flexWrap: 'wrap' }}>
          <Stat label="Total" value={`LKR ${job.total_price.toLocaleString()}`} />
          <Stat label="Paid" value={`LKR ${totalPaid.toLocaleString()}`} color="#16a34a" />
          <Stat label="Balance due" value={`LKR ${balanceDue.toLocaleString()}`} color={balanceDue > 0 ? '#dc2626' : '#16a34a'} />
        </div>

        {payments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <div style={{ flex: 1, textTransform: 'capitalize' }}>
                  {p.type}
                  <span style={{ color: '#9ca3af', marginLeft: 8, textTransform: 'capitalize' }}>{p.method}</span>
                </div>
                <span style={{ fontWeight: 600 }}>LKR {p.amount.toLocaleString()}</span>
                {p.status === 'paid' ? (
                  <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 8, fontWeight: 500 }}>Paid</span>
                ) : (
                  <span style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 8, fontWeight: 500 }}>Pending</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Flipbook */}
      {flipbook && (
        <Section title="Flipbook">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontSize: 13, color: '#6b7280' }}>
              Your photo flipbook is ready to view.
            </p>
            <a
              href={`${import.meta.env.VITE_APP_URL ?? ''}/flipbook/${flipbook.share_token}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: '#fff',
                background: '#2563eb',
                padding: '6px 14px',
                borderRadius: 6,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              View flipbook ↗
            </a>
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 20, marginBottom: 14 }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color ?? '#111827', marginTop: 2 }}>{value}</div>
    </div>
  );
}

const loadingStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 14, padding: '32px 0' };
