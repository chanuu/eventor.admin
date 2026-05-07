import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  updateJob,
  updateJobStatus,
  addJobAddon,
  removeJobAddon,
  createShoot,
  recordPayment,
  markPaymentPaid,
} from '../actions';
import JobStatusForm from './JobStatusForm';

// ─── Types ────────────────────────────────────────────────────────────────────

type Job = {
  id: string;
  studio_id: string;
  title: string;
  event_type: string | null;
  status: string;
  total_price: number;
  notes: string | null;
  package_id: string | null;
  clients: { id: string; full_name: string } | null;
  packages: { name: string; base_price: number; shoots_included: number } | null;
};

type JobAddon = {
  id: string;
  price_at_booking: number;
  quantity: number;
  package_addons: { name: string } | null;
};

type AvailableAddon = { id: string; name: string; price: number };

type Shoot = {
  id: string;
  shoot_type: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: string;
};

type Payment = {
  id: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  paid_at: string | null;
  notes: string | null;
};

type Contract = {
  id: string;
  status: string;
  sent_at: string | null;
  signed_at: string | null;
  signature_data: string | null;
};

const STATUS_STEPS = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

const SHOOT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  shot: 'Shot',
  editing: 'Editing',
  done: 'Done',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JobDetailPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('id, studio_id, title, event_type, status, total_price, notes, package_id, clients(id, full_name), packages(name, base_price, shoots_included)')
    .eq('id', params.id)
    .single();

  if (!jobRaw) notFound();
  const job = jobRaw as unknown as Job;

  const [
    { data: jobAddonsRaw },
    { data: availableAddonsRaw },
    { data: shootsRaw },
    { data: paymentsRaw },
    { data: contractRaw },
  ] = await Promise.all([
    supabase
      .from('job_addons')
      .select('id, price_at_booking, quantity, package_addons(name)')
      .eq('job_id', params.id),
    job.package_id
      ? supabase
          .from('package_addons')
          .select('id, name, price')
          .eq('package_id', job.package_id)
          .eq('is_active', true)
      : Promise.resolve({ data: [] }),
    supabase
      .from('shoots')
      .select('id, shoot_type, scheduled_at, venue, status')
      .eq('job_id', params.id)
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('payments')
      .select('id, type, amount, method, status, paid_at, notes')
      .eq('job_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('contracts')
      .select('id, status, sent_at, signed_at, signature_data')
      .eq('job_id', params.id)
      .maybeSingle(),
  ]);

  const jobAddons       = (jobAddonsRaw       ?? []) as unknown as JobAddon[];
  const availableAddons = (availableAddonsRaw ?? []) as AvailableAddon[];
  const shoots          = (shootsRaw          ?? []) as Shoot[];
  const payments        = (paymentsRaw        ?? []) as Payment[];
  const contract        = contractRaw as Contract | null;

  const client = job.clients as { id: string; full_name: string } | null;
  const pkg = job.packages as { name: string; base_price: number; shoots_included: number } | null;

  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const balanceDue = job.total_price - totalPaid;

  const updateJobAction = updateJob.bind(null, job.id, job.studio_id);
  const addAddonAction = addJobAddon.bind(null, job.id, job.studio_id);
  const createShootAction = createShoot.bind(null, job.id, job.studio_id);
  const recordPaymentAction = recordPayment.bind(null, job.id, job.studio_id);

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href="/jobs" style={{ fontSize: 13, color: '#6b7280' }}>← Jobs</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{job.title}</h1>
          <StatusBadge status={job.status} />
        </div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
          {client?.full_name ?? '—'}{job.event_type ? ` · ${job.event_type}` : ''}
        </div>
        {searchParams.saved && (
          <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>
        )}
      </div>

      {/* Status progression */}
      <Section title="Status">
        <JobStatusForm jobId={job.id} current={job.status} steps={STATUS_STEPS} updateStatusAction={updateJobStatus} />
      </Section>

      {/* Contract */}
      <Section title="Contract">
        {contract ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <ContractBadge status={contract.status} />
              {contract.sent_at && (
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 10 }}>
                  Sent {new Date(contract.sent_at).toLocaleDateString('en-LK')}
                </span>
              )}
              {contract.signed_at && (
                <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 6 }}>
                  · Signed {new Date(contract.signed_at).toLocaleDateString('en-LK')}
                  {contract.signature_data ? ` by ${contract.signature_data}` : ''}
                </span>
              )}
            </div>
            <a href={`/jobs/${job.id}/contract`} style={{ fontSize: 13, color: '#2563eb', fontWeight: 500 }}>
              {contract.status === 'draft' ? 'Edit contract →' : 'View contract →'}
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No contract yet.</p>
            <a href={`/jobs/${job.id}/contract`} style={{ fontSize: 13, color: '#2563eb', fontWeight: 500 }}>
              Create contract →
            </a>
          </div>
        )}
      </Section>

      {/* Job details */}
      <Section title="Details">
        <form action={updateJobAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Title" required>
              <input name="title" required defaultValue={job.title} style={inputStyle} />
            </Field>
            <Field label="Event type">
              <input name="event_type" defaultValue={job.event_type ?? ''} style={inputStyle} placeholder="Wedding, Engagement…" />
            </Field>
          </div>
          <Field label="Notes">
            <textarea name="notes" rows={2} defaultValue={job.notes ?? ''} style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
          </Field>
          <div>
            <button type="submit" style={primaryBtn}>Save details</button>
          </div>
        </form>
      </Section>

      {/* Package & add-ons */}
      <Section title={`Package & add-ons${pkg ? ` — ${pkg.name}` : ''}`}>
        {pkg && (
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            <span style={{ color: '#374151' }}>Base price: </span>
            <span style={{ fontWeight: 600 }}>LKR {pkg.base_price.toLocaleString()}</span>
            <span style={{ color: '#9ca3af', marginLeft: 12 }}>{pkg.shoots_included} shoot{pkg.shoots_included !== 1 ? 's' : ''} included</span>
          </div>
        )}

        {jobAddons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {jobAddons.map((ja) => {
              const removeAction = removeJobAddon.bind(null, ja.id, job.id, job.studio_id);
              const addonName = (ja.package_addons as { name: string } | null)?.name ?? 'Add-on';
              return (
                <div key={ja.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                  <span style={{ flex: 1, fontSize: 13 }}>{addonName} ×{ja.quantity}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>LKR {(ja.price_at_booking * ja.quantity).toLocaleString()}</span>
                  <form action={removeAction}>
                    <button type="submit" style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>Remove</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {availableAddons.length > 0 && (
          <form action={addAddonAction} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="Add add-on">
              <select name="addon_id" style={{ ...inputStyle, width: 'auto', minWidth: 200 }}>
                {availableAddons.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} — LKR {a.price.toLocaleString()}</option>
                ))}
              </select>
            </Field>
            <Field label="Qty">
              <input name="quantity" type="number" min="1" defaultValue="1" style={{ ...inputStyle, width: 70 }} />
            </Field>
            <button type="submit" style={{ ...secondaryBtn, marginBottom: 1 }}>Add</button>
          </form>
        )}

        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Total: LKR {job.total_price.toLocaleString()}</span>
        </div>
      </Section>

      {/* Shoots */}
      <Section title="Shoots">
        {shoots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {shoots.map((shoot) => (
              <div key={shoot.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{shoot.shoot_type ?? 'Shoot'}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {shoot.scheduled_at ? new Date(shoot.scheduled_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not scheduled'}
                    {shoot.venue ? ` · ${shoot.venue}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                  {SHOOT_STATUS_LABELS[shoot.status] ?? shoot.status}
                </span>
                <a href={`/jobs/${job.id}/shoots/${shoot.id}`} style={{ fontSize: 12, color: '#2563eb', flexShrink: 0 }}>
                  Details
                </a>
              </div>
            ))}
          </div>
        )}

        <details>
          <summary style={{ fontSize: 13, cursor: 'pointer', color: '#2563eb', fontWeight: 500, userSelect: 'none' }}>
            + Add shoot
          </summary>
          <form action={createShootAction} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Shoot type">
                <input name="shoot_type" style={inputStyle} placeholder="Wedding, Pre-shoot…" />
              </Field>
              <Field label="Venue">
                <input name="venue" style={inputStyle} placeholder="Location" />
              </Field>
            </div>
            <Field label="Scheduled date & time">
              <input name="scheduled_at" type="datetime-local" style={inputStyle} />
            </Field>
            <div>
              <button type="submit" style={secondaryBtn}>Add shoot</button>
            </div>
          </form>
        </details>
      </Section>

      {/* Payments */}
      <Section title="Payments">
        <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
          <Stat label="Total" value={`LKR ${job.total_price.toLocaleString()}`} />
          <Stat label="Paid" value={`LKR ${totalPaid.toLocaleString()}`} color="#16a34a" />
          <Stat label="Balance due" value={`LKR ${balanceDue.toLocaleString()}`} color={balanceDue > 0 ? '#dc2626' : '#16a34a'} />
        </div>

        {payments.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {payments.map((p) => {
              const markPaidAction = markPaymentPaid.bind(null, p.id, job.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{p.type}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{p.method}</span>
                    {p.notes && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{p.notes}</span>}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>LKR {p.amount.toLocaleString()}</span>
                  {p.status === 'paid' ? (
                    <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 8 }}>Paid</span>
                  ) : (
                    <form action={markPaidAction}>
                      <button type="submit" style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', border: 'none', padding: '2px 8px', borderRadius: 8, cursor: 'pointer' }}>
                        Mark paid
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <details>
          <summary style={{ fontSize: 13, cursor: 'pointer', color: '#2563eb', fontWeight: 500, userSelect: 'none' }}>
            + Record payment
          </summary>
          <form action={recordPaymentAction} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <Field label="Type" required>
                <select name="type" required style={inputStyle}>
                  <option value="advance">Advance</option>
                  <option value="balance">Balance</option>
                  <option value="addon">Add-on</option>
                  <option value="refund">Refund</option>
                </select>
              </Field>
              <Field label="Method" required>
                <select name="method" required style={inputStyle}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                  <option value="payhere">PayHere</option>
                  <option value="cheque">Cheque</option>
                </select>
              </Field>
              <Field label="Amount (LKR)" required>
                <input name="amount" type="number" min="0" step="100" required style={inputStyle} placeholder="50000" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Paid on">
                <input name="paid_at" type="date" style={inputStyle} />
              </Field>
              <Field label="Notes">
                <input name="notes" style={inputStyle} placeholder="Optional reference…" />
              </Field>
            </div>
            <div>
              <button type="submit" style={secondaryBtn}>Record payment</button>
            </div>
          </form>
        </details>
      </Section>

      {/* Flipbook */}
      <Section title="Flipbook delivery">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 13, color: '#6b7280' }}>
            Upload and share a PDF flipbook with your client.
          </p>
          <a
            href={`/jobs/${job.id}/flipbook`}
            style={{ fontSize: 13, color: '#2563eb', fontWeight: 500 }}
          >
            Manage flipbook →
          </a>
        </div>
      </Section>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function ContractBadge({ status }: { status: string }) {
  const COLORS: Record<string, { bg: string; color: string }> = {
    draft:  { bg: '#f3f4f6', color: '#6b7280' },
    sent:   { bg: '#fef3c7', color: '#92400e' },
    signed: { bg: '#dcfce7', color: '#166534' },
    void:   { bg: '#fef2f2', color: '#991b1b' },
  };
  const { bg, color } = COLORS[status] ?? COLORS.draft;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: bg, color, textTransform: 'capitalize' }}>
      {status}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const COLORS: Record<string, { bg: string; color: string }> = {
    lead:       { bg: '#f3f4f6', color: '#6b7280' },
    quoted:     { bg: '#fef3c7', color: '#92400e' },
    contracted: { bg: '#dbeafe', color: '#1e40af' },
    active:     { bg: '#dcfce7', color: '#166534' },
    editing:    { bg: '#ede9fe', color: '#5b21b6' },
    proofing:   { bg: '#fce7f3', color: '#9d174d' },
    delivered:  { bg: '#d1fae5', color: '#065f46' },
    archived:   { bg: '#f3f4f6', color: '#9ca3af' },
  };
  const { bg, color } = COLORS[status] ?? COLORS.lead;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: bg, color, textTransform: 'capitalize' }}>
      {status}
    </span>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
