import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Job = {
  id: string;
  title: string;
  event_type: string | null;
  status: string;
  total_price: number;
  created_at: string;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280' },
  quoted:     { bg: '#fef3c7', color: '#92400e' },
  contracted: { bg: '#dbeafe', color: '#1e40af' },
  active:     { bg: '#dcfce7', color: '#166534' },
  editing:    { bg: '#ede9fe', color: '#5b21b6' },
  proofing:   { bg: '#fce7f3', color: '#9d174d' },
  delivered:  { bg: '#d1fae5', color: '#065f46' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af' },
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('jobs')
      .select('id, title, event_type, status, total_price, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs((data ?? []) as Job[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <p style={loadingStyle}>Loading…</p>;

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Your jobs</h1>

      {jobs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 8, fontSize: 14 }}>
          No jobs yet. Your photographer will create your job once you're booked.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {jobs.map((job) => {
            const badge = STATUS_COLORS[job.status] ?? STATUS_COLORS.lead;
            return (
              <Link
                key={job.id}
                to={`/jobs/${job.id}`}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '14px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'border-color 0.1s',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</div>
                    {job.event_type && (
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{job.event_type}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: 10,
                    background: badge.bg,
                    color: badge.color,
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                  }}>
                    {job.status}
                  </span>
                  <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: '#111827' }}>
                    LKR {job.total_price.toLocaleString()}
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: 16 }}>›</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const loadingStyle: React.CSSProperties = { color: '#9ca3af', fontSize: 14, padding: '32px 0' };
