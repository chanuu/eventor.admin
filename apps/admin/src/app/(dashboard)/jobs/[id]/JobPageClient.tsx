'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import JobStatusForm from './JobStatusForm';
import {
  updateJobStatus, updateJob,
  addJobAddon, removeJobAddon,
  createShoot, recordPayment, markPaymentPaid,
} from '../actions';

// ─── Types ────────────────────────────────────────────────────────────────────

type JobAddon   = { id: string; price_at_booking: number; quantity: number; addonName: string };
type AvailAddon = { id: string; name: string; price: number };
type Shoot      = { id: string; shoot_type: string | null; scheduled_at: string | null; venue: string | null; status: string };
type Payment    = { id: string; type: string; amount: number; method: string; status: string; paid_at: string | null; notes: string | null };
type Contract   = { id: string; status: string; sent_at: string | null; signed_at: string | null; signature_data: string | null };
type Pkg        = { name: string; base_price: number; shoots_included: number };

export type JobData = {
  title: string; eventType: string | null; status: string; totalPrice: number; notes: string | null;
  clientName: string | null; pkg: Pkg | null; jobAddons: JobAddon[]; availableAddons: AvailAddon[];
  shoots: Shoot[]; payments: Payment[]; contract: Contract | null;
};

export type JobPageClientProps = {
  jobId: string; studioId: string;
  initialData: JobData;
  initialTab: string; savedParam: boolean;
};

// ─── Browser-side query function ─────────────────────────────────────────────

async function fetchJob(jobId: string): Promise<JobData> {
  const supabase = createClient();
  const { data: raw, error } = await supabase
    .from('jobs')
    .select(`
      title, event_type, status, total_price, notes,
      clients(id, full_name),
      packages(name, base_price, shoots_included, package_addons(id, name, price, is_active)),
      job_addons(id, price_at_booking, quantity, package_addons(name)),
      shoots(id, shoot_type, scheduled_at, venue, status),
      payments(id, type, amount, method, status, paid_at, notes),
      contracts(id, status, sent_at, signed_at, signature_data)
    `)
    .eq('id', jobId)
    .single();

  if (error || !raw) throw new Error(error?.message ?? 'Failed to load job');

  const r = raw as any;
  const client = r.clients as { full_name: string } | null;
  const pkg = r.packages as { name: string; base_price: number; shoots_included: number; package_addons: { id: string; name: string; price: number; is_active: boolean }[] } | null;

  const shoots: Shoot[] = [...((r.shoots ?? []) as Shoot[])].sort((a, b) => {
    if (!a.scheduled_at) return 1;
    if (!b.scheduled_at) return -1;
    return a.scheduled_at.localeCompare(b.scheduled_at);
  });

  const jobAddons: JobAddon[] = ((r.job_addons ?? []) as any[]).map((ja) => ({
    id: ja.id,
    price_at_booking: ja.price_at_booking,
    quantity: ja.quantity,
    addonName: (ja.package_addons as { name: string } | null)?.name ?? 'Add-on',
  }));

  const availableAddons: AvailAddon[] = (pkg?.package_addons ?? [])
    .filter((a) => a.is_active)
    .map(({ id, name, price }) => ({ id, name, price }));

  return {
    title: r.title,
    eventType: r.event_type,
    status: r.status,
    totalPrice: r.total_price,
    notes: r.notes,
    clientName: client?.full_name ?? null,
    pkg: pkg ? { name: pkg.name, base_price: pkg.base_price, shoots_included: pkg.shoots_included } : null,
    jobAddons,
    availableAddons,
    shoots,
    payments: (r.payments ?? []) as Payment[],
    contract: ((r.contracts ?? []) as Contract[])[0] ?? null,
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'details',  label: 'Details'  },
  { id: 'shoots',   label: 'Shoots'   },
  { id: 'payments', label: 'Payments' },
  { id: 'contract', label: 'Contract' },
  { id: 'flipbook', label: 'Flipbook' },
] as const;
type TabId = typeof TABS[number]['id'];

const SHOOT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled', shot: 'Shot', editing: 'Editing', done: 'Done',
};

const STATUS_STEPS = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280' },
  quoted:     { bg: '#fef3c7', color: '#92400e' },
  contracted: { bg: '#dbeafe', color: '#1e40af' },
  active:     { bg: '#dcfce7', color: '#166534' },
  editing:    { bg: '#ede9fe', color: '#5b21b6' },
  proofing:   { bg: '#fce7f3', color: '#9d174d' },
  delivered:  { bg: '#d1fae5', color: '#065f46' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobPageClient({
  jobId, studioId, initialData, initialTab, savedParam,
}: JobPageClientProps) {
  const queryClient = useQueryClient();
  const validTab    = TABS.find((t) => t.id === initialTab)?.id ?? 'details';
  const [activeTab, setActiveTab] = useState<TabId>(validTab as TabId);
  const [showSaved, setShowSaved] = useState(savedParam);
  const shootFormRef   = useRef<HTMLFormElement>(null);
  const addonFormRef   = useRef<HTMLFormElement>(null);
  const paymentFormRef = useRef<HTMLFormElement>(null);

  const { data: job = initialData } = useQuery({
    queryKey: ['job', jobId],
    queryFn:  () => fetchJob(jobId),
    initialData,
    staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['job', jobId] });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateJobStatus(jobId, status),
    onSuccess:  invalidate,
  });

  const updateJobMutation = useMutation({
    mutationFn: (fd: FormData) => updateJob(jobId, studioId, fd),
    onSuccess:  () => {
      invalidate();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 3000);
    },
  });

  const addAddonMutation = useMutation({
    mutationFn: (fd: FormData) => addJobAddon(jobId, studioId, fd),
    onSuccess:  () => { invalidate(); addonFormRef.current?.reset(); },
  });

  const removeAddonMutation = useMutation({
    mutationFn: (addonId: string) => removeJobAddon(addonId, jobId, studioId),
    onSuccess:  invalidate,
  });

  const createShootMutation = useMutation({
    mutationFn: (fd: FormData) => createShoot(jobId, studioId, fd),
    onSuccess:  () => { invalidate(); shootFormRef.current?.reset(); },
  });

  const recordPaymentMutation = useMutation({
    mutationFn: (fd: FormData) => recordPayment(jobId, studioId, fd),
    onSuccess:  () => { invalidate(); paymentFormRef.current?.reset(); },
  });

  const markPaidMutation = useMutation({
    mutationFn: (paymentId: string) => markPaymentPaid(paymentId, jobId),
    onSuccess:  invalidate,
  });

  const totalPaid  = job.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const balanceDue = job.totalPrice - totalPaid;
  const { bg: sBg, color: sColor } = STATUS_BADGE[job.status] ?? STATUS_BADGE.lead;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <a href="/jobs" style={{ fontSize: 13, color: '#6b7280' }}>← Jobs</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{job.title}</h1>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10, background: sBg, color: sColor, textTransform: 'capitalize' }}>
            {job.status}
          </span>
        </div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>
          {job.clientName ?? '—'}{job.eventType ? ` · ${job.eventType}` : ''}
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>

        {/* ── Status row — always visible ─────────────────────── */}
        <div style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Status</span>
          <JobStatusForm
            current={job.status}
            steps={STATUS_STEPS}
            isPending={statusMutation.isPending}
            onStatusChange={(s) => statusMutation.mutate(s)}
          />
        </div>

        {/* ── Tab nav ─────────────────────────────────────────── */}
        <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', overflowX: 'auto' }}>
          {TABS.map(({ id, label }) => {
            const count  = id === 'shoots' ? job.shoots.length : id === 'payments' ? job.payments.length : 0;
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => setActiveTab(id as TabId)} style={{
                padding: '10px 18px', fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? '#2563eb' : '#6b7280',
                background: 'none', border: 'none',
                borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                marginBottom: -1, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                {label}{count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}
        </div>

        {/* ── Tab content ─────────────────────────────────────── */}
        <div style={{ background: '#fff', padding: 24 }}>

          {/* Details */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {showSaved && <p style={{ fontSize: 13, color: '#16a34a', margin: 0 }}>Changes saved.</p>}

              <form
                key={`${job.title}::${job.eventType}::${job.notes}`}
                onSubmit={(e) => { e.preventDefault(); updateJobMutation.mutate(new FormData(e.currentTarget)); }}
                style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Title" required>
                    <input name="title" required defaultValue={job.title} style={inp} />
                  </Field>
                  <Field label="Event type">
                    <input name="event_type" defaultValue={job.eventType ?? ''} style={inp} placeholder="Wedding, Engagement…" />
                  </Field>
                </div>
                <Field label="Notes">
                  <textarea name="notes" rows={2} defaultValue={job.notes ?? ''} style={{ ...inp, height: 'auto', padding: '8px 12px', resize: 'vertical' }} />
                </Field>
                <div>
                  <button type="submit" disabled={updateJobMutation.isPending} style={primaryBtn}>
                    {updateJobMutation.isPending ? 'Saving…' : 'Save details'}
                  </button>
                </div>
              </form>

              {job.pkg && (
                <div>
                  <h3 style={sh}>Package — {job.pkg.name}</h3>
                  <p style={{ fontSize: 13, marginBottom: 12 }}>
                    Base price: <strong>LKR {job.pkg.base_price.toLocaleString()}</strong>
                    <span style={{ color: '#9ca3af', marginLeft: 12 }}>{job.pkg.shoots_included} shoot{job.pkg.shoots_included !== 1 ? 's' : ''} included</span>
                  </p>

                  {job.jobAddons.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {job.jobAddons.map((ja) => (
                        <div key={ja.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                          <span style={{ flex: 1, fontSize: 13 }}>{ja.addonName} ×{ja.quantity}</span>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>LKR {(ja.price_at_booking * ja.quantity).toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => removeAddonMutation.mutate(ja.id)}
                            disabled={removeAddonMutation.isPending}
                            style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {job.availableAddons.length > 0 && (
                    <form
                      ref={addonFormRef}
                      onSubmit={(e) => { e.preventDefault(); addAddonMutation.mutate(new FormData(e.currentTarget)); }}
                      style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}
                    >
                      <Field label="Add add-on">
                        <select name="addon_id" style={{ ...inp, width: 'auto', minWidth: 200 }}>
                          {job.availableAddons.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} — LKR {a.price.toLocaleString()}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Qty">
                        <input name="quantity" type="number" min="1" defaultValue="1" style={{ ...inp, width: 70 }} />
                      </Field>
                      <button type="submit" disabled={addAddonMutation.isPending} style={{ ...secondaryBtn, marginBottom: 1 }}>
                        {addAddonMutation.isPending ? '…' : 'Add'}
                      </button>
                    </form>
                  )}

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>Total: LKR {job.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shoots */}
          {activeTab === 'shoots' && (
            <div>
              {job.shoots.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>No shoots added yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {job.shoots.map((shoot) => (
                    <div key={shoot.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{shoot.shoot_type ?? 'Shoot'}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                          {shoot.scheduled_at
                            ? new Date(shoot.scheduled_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
                            : 'Not scheduled'}
                          {shoot.venue ? ` · ${shoot.venue}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 8, whiteSpace: 'nowrap' }}>
                        {SHOOT_STATUS_LABELS[shoot.status] ?? shoot.status}
                      </span>
                      <a href={`/jobs/${jobId}/shoots/${shoot.id}`} style={{ fontSize: 12, color: '#2563eb', flexShrink: 0 }}>Details</a>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: job.shoots.length > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: job.shoots.length > 0 ? 20 : 0 }}>
                <h3 style={sh}>Add shoot</h3>
                <form
                  ref={shootFormRef}
                  onSubmit={(e) => { e.preventDefault(); createShootMutation.mutate(new FormData(e.currentTarget)); }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Shoot type"><input name="shoot_type" style={inp} placeholder="Wedding, Pre-shoot…" /></Field>
                    <Field label="Venue"><input name="venue" style={inp} placeholder="Location" /></Field>
                  </div>
                  <Field label="Scheduled date & time">
                    <input name="scheduled_at" type="datetime-local" style={inp} />
                  </Field>
                  <div>
                    <button type="submit" disabled={createShootMutation.isPending} style={secondaryBtn}>
                      {createShootMutation.isPending ? 'Adding…' : 'Add shoot'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Payments */}
          {activeTab === 'payments' && (
            <div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 20, padding: '16px 20px', background: '#f9fafb', borderRadius: 6 }}>
                <Stat label="Total"       value={`LKR ${job.totalPrice.toLocaleString()}`} />
                <Stat label="Paid"        value={`LKR ${totalPaid.toLocaleString()}`}   color="#16a34a" />
                <Stat label="Balance due" value={`LKR ${balanceDue.toLocaleString()}`}  color={balanceDue > 0 ? '#dc2626' : '#16a34a'} />
              </div>

              {job.payments.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
                  {job.payments.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, textTransform: 'capitalize' }}>{p.type}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{p.method}</span>
                        {p.notes   && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{p.notes}</span>}
                        {p.paid_at && <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{new Date(p.paid_at).toLocaleDateString('en-LK')}</span>}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>LKR {p.amount.toLocaleString()}</span>
                      {p.status === 'paid' ? (
                        <span style={{ fontSize: 11, background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: 8 }}>Paid</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markPaidMutation.mutate(p.id)}
                          disabled={markPaidMutation.isPending}
                          style={{ fontSize: 11, background: '#fef3c7', color: '#92400e', border: 'none', padding: '2px 8px', borderRadius: 8, cursor: 'pointer' }}
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: job.payments.length > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: job.payments.length > 0 ? 20 : 0 }}>
                <h3 style={sh}>Record payment</h3>
                <form
                  ref={paymentFormRef}
                  onSubmit={(e) => { e.preventDefault(); recordPaymentMutation.mutate(new FormData(e.currentTarget)); }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    <Field label="Type" required>
                      <select name="type" required style={inp}>
                        <option value="advance">Advance</option>
                        <option value="balance">Balance</option>
                        <option value="addon">Add-on</option>
                        <option value="refund">Refund</option>
                      </select>
                    </Field>
                    <Field label="Method" required>
                      <select name="method" required style={inp}>
                        <option value="cash">Cash</option>
                        <option value="bank">Bank transfer</option>
                        <option value="payhere">PayHere</option>
                        <option value="cheque">Cheque</option>
                      </select>
                    </Field>
                    <Field label="Amount (LKR)" required>
                      <input name="amount" type="number" min="0" step="100" required style={inp} placeholder="50000" />
                    </Field>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <Field label="Paid on"><input name="paid_at" type="date" style={inp} /></Field>
                    <Field label="Notes"><input name="notes" style={inp} placeholder="Optional reference…" /></Field>
                  </div>
                  <div>
                    <button type="submit" disabled={recordPaymentMutation.isPending} style={secondaryBtn}>
                      {recordPaymentMutation.isPending ? 'Recording…' : 'Record payment'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Contract */}
          {activeTab === 'contract' && (
            <div>
              {job.contract ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                    <ContractBadge status={job.contract.status} />
                    {job.contract.sent_at   && <span style={{ fontSize: 13, color: '#6b7280' }}>Sent {new Date(job.contract.sent_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</span>}
                    {job.contract.signed_at && (
                      <span style={{ fontSize: 13, color: '#6b7280' }}>
                        · Signed {new Date(job.contract.signed_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                        {job.contract.signature_data ? ` by ${job.contract.signature_data}` : ''}
                      </span>
                    )}
                  </div>
                  <a href={`/jobs/${jobId}/contract`} style={primaryLink}>
                    {job.contract.status === 'draft' ? 'Edit contract →' : 'View contract →'}
                  </a>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>No contract created yet.</p>
                  <a href={`/jobs/${jobId}/contract`} style={primaryLink}>Create contract →</a>
                </>
              )}
            </div>
          )}

          {/* Flipbook */}
          {activeTab === 'flipbook' && (
            <div>
              <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>Upload and share a PDF flipbook with your client.</p>
              <a href={`/jobs/${jobId}/flipbook`} style={primaryLink}>Manage flipbook →</a>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function ContractBadge({ status }: { status: string }) {
  const C: Record<string, { bg: string; color: string }> = {
    draft:  { bg: '#f3f4f6', color: '#6b7280' },
    sent:   { bg: '#fef3c7', color: '#92400e' },
    signed: { bg: '#dcfce7', color: '#166534' },
    void:   { bg: '#fef2f2', color: '#991b1b' },
  };
  const { bg, color } = C[status] ?? C.draft;
  return <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 10, background: bg, color, textTransform: 'capitalize' }}>{status}</span>;
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

const inp:          React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn:   React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const primaryLink:  React.CSSProperties = { display: 'inline-block', fontSize: 13, fontWeight: 500, color: '#fff', background: '#2563eb', padding: '8px 18px', borderRadius: 6, textDecoration: 'none' };
const sh:           React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 };
