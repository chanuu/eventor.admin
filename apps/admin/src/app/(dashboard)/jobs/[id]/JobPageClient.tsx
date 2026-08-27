'use client';

import { EmptyState } from '@/components/states';

import Link from "next/link";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/Modal';
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

// ─── Browser query ────────────────────────────────────────────────────────────

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
    .eq('id', jobId).single();

  if (error || !raw) throw new Error(error?.message ?? 'Failed to load job');
  const r = raw as any;
  const client = r.clients as { full_name: string } | null;
  const pkg = r.packages as { name: string; base_price: number; shoots_included: number; package_addons: { id: string; name: string; price: number; is_active: boolean }[] } | null;
  const shoots: Shoot[] = [...((r.shoots ?? []) as Shoot[])].sort((a, b) => {
    if (!a.scheduled_at) return 1; if (!b.scheduled_at) return -1;
    return a.scheduled_at.localeCompare(b.scheduled_at);
  });
  return {
    title: r.title, eventType: r.event_type, status: r.status, totalPrice: r.total_price, notes: r.notes,
    clientName: client?.full_name ?? null,
    pkg: pkg ? { name: pkg.name, base_price: pkg.base_price, shoots_included: pkg.shoots_included } : null,
    jobAddons: ((r.job_addons ?? []) as any[]).map((ja) => ({
      id: ja.id, price_at_booking: ja.price_at_booking, quantity: ja.quantity,
      addonName: (ja.package_addons as { name: string } | null)?.name ?? 'Add-on',
    })),
    availableAddons: (pkg?.package_addons ?? []).filter((a) => a.is_active).map(({ id, name, price }) => ({ id, name, price })),
    shoots,
    payments: (r.payments ?? []) as Payment[],
    contract: ((r.contracts ?? []) as Contract[])[0] ?? null,
  };
}

const TABS = [
  { id: 'details',  label: 'Details'  },
  { id: 'shoots',   label: 'Shoots'   },
  { id: 'payments', label: 'Payments' },
  { id: 'contract', label: 'Contract' },
  { id: 'gallery',  label: 'Gallery'  },
  { id: 'album',    label: 'Album'    },
] as const;
type TabId = typeof TABS[number]['id'];

const STATUS_STEPS = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

const STATUS_BADGE: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600', quoted: 'bg-amber-50 text-amber-700',
  contracted: 'bg-blue-50 text-blue-700', active: 'bg-green-50 text-[#0F3D2E]',
  editing: 'bg-violet-50 text-violet-700', proofing: 'bg-pink-50 text-pink-700',
  delivered: 'bg-emerald-50 text-emerald-700', archived: 'bg-gray-100 text-gray-400',
};

const SHOOT_STATUS: Record<string, string> = { scheduled: 'Scheduled', shot: 'Shot', editing: 'Editing', done: 'Done' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function JobPageClient({ jobId, studioId, initialData, initialTab, savedParam }: JobPageClientProps) {
  const queryClient   = useQueryClient();
  const validTab      = TABS.find((t) => t.id === initialTab)?.id ?? 'details';
  const [activeTab, setActiveTab] = useState<TabId>(validTab as TabId);
  const [showSaved, setShowSaved] = useState(savedParam);

  // Which add/edit modal is open (null = none)
  const [openModal, setOpenModal] = useState<'details' | 'addon' | 'shoot' | 'payment' | null>(null);
  const closeModal = () => setOpenModal(null);

  const { data: job = initialData } = useQuery({
    queryKey: ['job', jobId], queryFn: () => fetchJob(jobId),
    initialData, staleTime: 30_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['job', jobId] });

  const statusMutation       = useMutation({ mutationFn: (s: string) => updateJobStatus(jobId, s), onSuccess: invalidate });
  const updateJobMutation    = useMutation({ mutationFn: (fd: FormData) => updateJob(jobId, studioId, fd), onSuccess: () => { invalidate(); closeModal(); setShowSaved(true); setTimeout(() => setShowSaved(false), 3000); } });
  const addAddonMutation     = useMutation({ mutationFn: (fd: FormData) => addJobAddon(jobId, studioId, fd), onSuccess: () => { invalidate(); closeModal(); } });
  const removeAddonMutation  = useMutation({ mutationFn: (id: string) => removeJobAddon(id, jobId, studioId), onSuccess: invalidate });
  const createShootMutation  = useMutation({ mutationFn: (fd: FormData) => createShoot(jobId, studioId, fd), onSuccess: () => { invalidate(); closeModal(); } });
  const recordPayMutation    = useMutation({ mutationFn: (fd: FormData) => recordPayment(jobId, studioId, fd), onSuccess: () => { invalidate(); closeModal(); } });
  const markPaidMutation     = useMutation({ mutationFn: (id: string) => markPaymentPaid(id, jobId), onSuccess: invalidate });

  const totalPaid  = job.payments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const balanceDue = job.totalPrice - totalPaid;

  return (
    <div>
      {/* ── Page heading ── */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <Link href="/jobs" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">← Jobs</Link>
          <div className="flex items-center gap-2.5 mt-1">
            <h1 className="page-title">{job.title}</h1>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[job.status] ?? STATUS_BADGE.lead}`}>
              {job.status}
            </span>
          </div>
          <p className="breadcrumb mt-0.5">
            Main Menu / <Link href="/jobs" className="hover:text-[#0F3D2E]">Jobs</Link> / <span className="text-[#0F3D2E]">{job.title}</span>
          </p>
        </div>
      </div>

      {/* ── Main panel ── */}
      <div className="bg-white rounded-2xl shadow-card mt-5 overflow-hidden">

        {/* Status bar */}
        <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 bg-gray-50 border-b border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
          <JobStatusForm current={job.status} steps={STATUS_STEPS} isPending={statusMutation.isPending} onStatusChange={(s) => statusMutation.mutate(s)} />
        </div>

        {/* Tab nav — pills that wrap, so all seven stay reachable on a phone */}
        <div className="bg-white border-b border-line px-4 sm:px-5 py-3.5">
          <div className="flex flex-wrap gap-1.5 gap-y-2">
            {TABS.map(({ id, label }) => {
              const count  = id === 'shoots' ? job.shoots.length : id === 'payments' ? job.payments.length : 0;
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as TabId)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-[10px] border px-4 sm:px-[18px] py-[11px]
                    text-[13.5px] font-bold transition-colors
                    ${active
                      ? 'bg-primary text-white border-primary'
                      : 'bg-panel text-ink-mid border-line hover:bg-lime-soft'}`}
                >
                  <span>{label}</span>
                  {count > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold
                      ${active ? 'bg-lime text-primary' : 'bg-line-soft text-ink-mid'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-4 sm:p-6">

          {/* ── Details ── */}
          {activeTab === 'details' && (
            <div className="flex flex-col gap-6">
              {showSaved && <p className="text-sm text-emerald-600 font-medium">Changes saved.</p>}

              <div>
                <SectionHeader title="Job Details"
                  action={<button type="button" onClick={() => setOpenModal('details')} className="btn-secondary">Edit Details</button>} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ReadField label="Title" value={job.title} />
                  <ReadField label="Event Type" value={job.eventType} />
                </div>
                <div className="mt-4">
                  <ReadField label="Notes" value={job.notes} />
                </div>
              </div>

              {job.pkg && (
                <div className="border-t border-gray-100 pt-5">
                  <SectionHeader title={`Package — ${job.pkg.name}`}
                    action={job.availableAddons.length > 0
                      ? <button type="button" onClick={() => setOpenModal('addon')} className="btn-secondary">+ Add Add-on</button>
                      : null} />
                  <p className="text-sm text-gray-600 mb-3">
                    Base price: <strong className="text-gray-900">LKR {job.pkg.base_price.toLocaleString()}</strong>
                    <span className="text-gray-400 ml-3">{job.pkg.shoots_included} shoot{job.pkg.shoots_included !== 1 ? 's' : ''} included</span>
                  </p>

                  {job.jobAddons.length > 0 && (
                    <div className="flex flex-col gap-2 mb-4">
                      {job.jobAddons.map((ja) => (
                        <div key={ja.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                          <span className="flex-1 text-sm text-gray-700">{ja.addonName} ×{ja.quantity}</span>
                          <span className="text-sm font-semibold text-gray-900">LKR {(ja.price_at_booking * ja.quantity).toLocaleString()}</span>
                          <button type="button" onClick={() => removeAddonMutation.mutate(ja.id)} disabled={removeAddonMutation.isPending}
                            className="text-xs text-red-500 hover:text-red-700 transition-colors">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {job.jobAddons.length === 0 && (
                    <EmptyState compact title="No add-ons yet" description="Extras you add appear here and are included in the job total." />
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                    <span className="text-base font-bold text-gray-900">Total: LKR {job.totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Shoots ── */}
          {activeTab === 'shoots' && (
            <div>
              <SectionHeader title="Shoots"
                action={<button type="button" onClick={() => setOpenModal('shoot')} className="btn-primary">+ Add Shoot</button>} />

              {job.shoots.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {job.shoots.map((shoot) => (
                    <div key={shoot.id} className="flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-xl hover:border-gray-200 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{shoot.shoot_type ?? 'Shoot'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {shoot.scheduled_at
                            ? new Date(shoot.scheduled_at).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' })
                            : 'Not scheduled'}
                          {shoot.venue ? ` · ${shoot.venue}` : ''}
                        </p>
                      </div>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full whitespace-nowrap">
                        {SHOOT_STATUS[shoot.status] ?? shoot.status}
                      </span>
                      <Link href={`/jobs/${jobId}/shoots/${shoot.id}`} className="text-xs font-medium text-[#0F3D2E] hover:underline shrink-0">Details</Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-line">
                  <EmptyState compact title="No shoots scheduled" description="Add a shoot to plan the dates, venues and crew for this job." />
                </div>
              )}
            </div>
          )}

          {/* ── Payments ── */}
          {activeTab === 'payments' && (
            <div>
              <SectionHeader title="Payments"
                action={<button type="button" onClick={() => setOpenModal('payment')} className="btn-primary">+ Record Payment</button>} />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5 p-4 bg-gray-50 rounded-xl">
                <StatBox label="Total"       value={`LKR ${job.totalPrice.toLocaleString()}`} />
                <StatBox label="Paid"        value={`LKR ${totalPaid.toLocaleString()}`}   color="text-emerald-600" />
                <StatBox label="Balance Due" value={`LKR ${balanceDue.toLocaleString()}`}  color={balanceDue > 0 ? 'text-red-500' : 'text-emerald-600'} />
              </div>

              {job.payments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {job.payments.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 capitalize">{p.type}</span>
                        <span className="text-xs text-gray-400 ml-2">{p.method}</span>
                        {p.notes   && <span className="text-xs text-gray-400 ml-2">{p.notes}</span>}
                        {p.paid_at && <span className="text-xs text-gray-400 ml-2">{new Date(p.paid_at).toLocaleDateString('en-LK')}</span>}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">LKR {p.amount.toLocaleString()}</span>
                      {p.status === 'paid'
                        ? <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full">Paid</span>
                        : <button type="button" onClick={() => markPaidMutation.mutate(p.id)} disabled={markPaidMutation.isPending}
                            className="text-xs bg-amber-50 text-amber-700 font-semibold px-2.5 py-1 rounded-full hover:bg-amber-100 transition-colors border-0 cursor-pointer">
                            Mark paid
                          </button>
                      }
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-line">
                  <EmptyState compact title="No payments recorded" description="Record an advance or balance payment to track what is owed." />
                </div>
              )}
            </div>
          )}

          {/* ── Contract ── */}
          {activeTab === 'contract' && (
            <div>
              {job.contract ? (
                <>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <ContractBadge status={job.contract.status} />
                    {job.contract.sent_at   && <span className="text-sm text-gray-500">Sent {new Date(job.contract.sent_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</span>}
                    {job.contract.signed_at && (
                      <span className="text-sm text-gray-500">
                        · Signed {new Date(job.contract.signed_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                        {job.contract.signature_data ? ` by ${job.contract.signature_data}` : ''}
                      </span>
                    )}
                  </div>
                  <Link href={`/jobs/${jobId}/contract`} className="btn-primary">
                    {job.contract.status === 'draft' ? 'Open Agreement →' : 'View Agreement →'}
                  </Link>
                </>
              ) : (
                <>
                  <EmptyState compact title="No agreement yet" description="Create the agreement to send it to your client for signing." />
                  <Link href={`/jobs/${jobId}/contract`} className="btn-primary">Create Agreement →</Link>
                </>
              )}
            </div>
          )}

          {/* ── Gallery ── */}
          {activeTab === 'gallery' && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Upload photos for client proofing and album selection.</p>
              <Link href={`/jobs/${jobId}/gallery`} className="btn-primary">Manage Gallery →</Link>
            </div>
          )}

          {/* ── Digital album ── */}
          {activeTab === 'album' && (
            <div>
              <p className="text-sm text-ink-muted mb-4">
                Build the flip-through digital album: cover text, page order, captions and music.
              </p>
              <Link href={`/jobs/${jobId}/album`} className="btn-primary">Manage Album →</Link>
            </div>
          )}

        </div>
      </div>

      {/* ── Modals ── */}

      <Modal open={openModal === 'details'} onClose={closeModal} title="Edit Job Details">
        <form onSubmit={(e) => { e.preventDefault(); updateJobMutation.mutate(new FormData(e.currentTarget)); }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Title" required>
              <input name="title" required defaultValue={job.title} className="input" />
            </FormField>
            <FormField label="Event Type">
              <input name="event_type" defaultValue={job.eventType ?? ''} placeholder="Wedding, Engagement…" className="input" />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea name="notes" rows={3} defaultValue={job.notes ?? ''} className="input h-auto py-2 resize-vertical" />
          </FormField>
          <ModalActions onCancel={closeModal} pending={updateJobMutation.isPending} label="Save Details" pendingLabel="Saving…" />
        </form>
      </Modal>

      <Modal open={openModal === 'addon'} onClose={closeModal} title="Add Add-on" width="max-w-lg">
        <form onSubmit={(e) => { e.preventDefault(); addAddonMutation.mutate(new FormData(e.currentTarget)); }}
          className="flex flex-col gap-4"
        >
          <FormField label="Add-on" required>
            <select name="addon_id" required className="input">
              {job.availableAddons.map((a) => (
                <option key={a.id} value={a.id}>{a.name} — LKR {a.price.toLocaleString()}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Qty">
            <input name="quantity" type="number" min="1" defaultValue="1" className="input w-28" />
          </FormField>
          <ModalActions onCancel={closeModal} pending={addAddonMutation.isPending} label="Add Add-on" pendingLabel="Adding…" />
        </form>
      </Modal>

      <Modal open={openModal === 'shoot'} onClose={closeModal} title="Add Shoot">
        <form onSubmit={(e) => { e.preventDefault(); createShootMutation.mutate(new FormData(e.currentTarget)); }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Shoot Type"><input name="shoot_type" className="input" placeholder="Wedding, Pre-shoot…" /></FormField>
            <FormField label="Venue"><input name="venue" className="input" placeholder="Location" /></FormField>
          </div>
          <FormField label="Scheduled Date & Time">
            <input name="scheduled_at" type="datetime-local" className="input" />
          </FormField>
          <ModalActions onCancel={closeModal} pending={createShootMutation.isPending} label="Add Shoot" pendingLabel="Adding…" />
        </form>
      </Modal>

      <Modal open={openModal === 'payment'} onClose={closeModal} title="Record Payment">
        <form onSubmit={(e) => { e.preventDefault(); recordPayMutation.mutate(new FormData(e.currentTarget)); }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Type" required>
              <select name="type" required className="input">
                <option value="advance">Advance</option>
                <option value="balance">Balance</option>
                <option value="addon">Add-on</option>
                <option value="refund">Refund</option>
              </select>
            </FormField>
            <FormField label="Method" required>
              <select name="method" required className="input">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="payhere">PayHere</option>
                <option value="cheque">Cheque</option>
              </select>
            </FormField>
            <FormField label="Amount (LKR)" required>
              <input name="amount" type="number" min="0" step="100" required className="input" placeholder="50000" />
            </FormField>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Paid On"><input name="paid_at" type="date" className="input" /></FormField>
            <FormField label="Notes"><input name="notes" className="input" placeholder="Optional reference…" /></FormField>
          </div>
          <ModalActions onCancel={closeModal} pending={recordPayMutation.isPending} label="Record Payment" pendingLabel="Recording…" />
        </form>
      </Modal>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Section title with an optional action button (the "Add" button above a grid). */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
      {action}
    </div>
  );
}

function ModalActions({ onCancel, pending, label, pendingLabel }: {
  onCancel: () => void; pending: boolean; label: string; pendingLabel: string;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-1">
      <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
      <button type="submit" disabled={pending} className="btn-primary">{pending ? pendingLabel : label}</button>
    </div>
  );
}

function ReadField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 whitespace-pre-wrap">{value?.trim() ? value : '—'}</span>
    </div>
  );
}

function ContractBadge({ status }: { status: string }) {
  const C: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600', sent: 'bg-amber-50 text-amber-700',
    signed: 'bg-emerald-50 text-emerald-700', void: 'bg-red-50 text-red-600',
  };
  return <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${C[status] ?? C.draft}`}>{status}</span>;
}

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color ?? 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
