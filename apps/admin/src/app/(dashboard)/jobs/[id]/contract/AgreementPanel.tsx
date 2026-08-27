'use client';

import { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { sendAgreement, voidContract } from './actions';
import CreateAgreementButton from './CreateAgreementButton';

type Props = {
  contractId: string;
  jobId: string;
  studioId: string;
  clientName: string;
  contentHtml: string | null;
  resolvedTemplate: string;
  status: string;
  createdAt: string | null;
  sentAt: string | null;
  signedAt: string | null;
  signatureData: string | null;
};

const STATUS: Record<string, { label: string; note: string; cls: string }> = {
  draft:  { label: 'Draft',  note: 'Only your studio can see this.',              cls: 'bg-panel text-ink-mid border-line' },
  sent:   { label: 'Sent',   note: 'Waiting for the client to sign.',             cls: 'bg-[#FFF3E6] text-[#a8631f] border-[#F3D9BC]' },
  signed: { label: 'Signed', note: 'The client has accepted the agreement.',      cls: 'bg-lime-soft text-lime-text border-lime-border' },
  void:   { label: 'Void',   note: 'This agreement is no longer in force.',       cls: 'bg-red-50 text-red-700 border-red-200' },
};

function when(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-LK', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AgreementPanel(props: Props) {
  const {
    contractId, jobId, studioId, clientName,
    contentHtml, resolvedTemplate, status, createdAt, sentAt, signedAt, signatureData,
  } = props;

  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function send() {
    setPending(true);
    setError('');
    const result = await sendAgreement(contractId, jobId, studioId);
    // A successful send redirects, so reaching here means it did not.
    setPending(false);
    if (result?.error) setError(result.error);
  }

  const s = STATUS[status] ?? STATUS.draft;
  const isDraft = status === 'draft';
  const isSigned = status === 'signed';
  const html = contentHtml ?? resolvedTemplate;

  return (
    <>
      <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
        {/* Status */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-5 sm:px-6 py-4 bg-panel border-b border-line">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-[11px] font-extrabold uppercase tracking-wide rounded-full border px-2.5 py-1 ${s.cls}`}>
              {s.label}
            </span>
            <span className="text-[12.5px] text-ink-muted">{s.note}</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOpen(true)} className="btn-secondary">View agreement</button>

            {isDraft && (
              <button onClick={send} disabled={pending} className="btn-primary">
                {pending ? 'Sending…' : 'Send to client'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="px-5 sm:px-6 py-3 text-[12.5px] text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </p>
        )}

        {/* Record */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Fact label="Client" value={clientName || '—'} />
            <Fact label="Created" value={when(createdAt)} />
            <Fact label="Sent to client" value={when(sentAt)} />
            <Fact
              label="Signed"
              value={isSigned ? when(signedAt) : status === 'void' ? 'Voided' : 'Not signed yet'}
              highlight={isSigned}
            />
          </div>

          {status === 'sent' && (
            <div className="mt-5 rounded-xl border border-[#F3D9BC] bg-[#FFF3E6] px-4 py-3.5">
              <p className="text-[13.5px] font-bold text-[#a8631f]">Waiting on {clientName || 'the client'}</p>
              <p className="text-[12.5px] text-[#8a6a45] mt-1 leading-relaxed">
                They can now read and sign it in their portal under <strong>Agreement</strong>. Signing
                is instant — this page shows the date and their name as soon as they accept. Nothing
                further is needed from you.
              </p>
            </div>
          )}

          {isSigned && (
            <div className="mt-5 rounded-xl border border-lime-border bg-lime-soft px-4 py-3.5">
              <p className="text-[13.5px] font-bold text-primary">
                Signed by {signatureData || clientName}
              </p>
              <p className="text-[12.5px] text-lime-text mt-1">
                Accepted on {when(signedAt)}. The client typed their full name as an electronic
                signature; this record is read-only from here on.
              </p>
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-line-soft flex gap-2 flex-wrap">
            <Link href={`/jobs/${jobId}`} className="btn-secondary">← Back to job</Link>
            {isDraft && (
              <CreateAgreementButton
                jobId={jobId}
                studioId={studioId}
                html={resolvedTemplate}
                label="Regenerate from current details"
                className="btn-secondary"
              />
            )}
            {status !== 'void' && !isSigned && (
              <form action={voidContract.bind(null, contractId, jobId, studioId)}>
                <button type="submit" className="btn-danger">Void agreement</button>
              </form>
            )}
          </div>

          {isDraft && (
            <p className="text-[12px] text-ink-muted mt-3 leading-relaxed">
              Regenerating rebuilds the document from the job, client, package and studio details as they
              are now. Only drafts can be regenerated.
            </p>
          )}
        </div>
      </div>

      {/* The document itself, rendered exactly as the client sees it */}
      <Modal open={open} onClose={() => setOpen(false)} title="Photography Services Agreement" width="max-w-3xl">
        <AgreementDocument html={html} />
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-line">
          <button onClick={() => setOpen(false)} className="btn-secondary">Close</button>
        </div>
      </Modal>
    </>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-panel border border-line-soft rounded-xl px-4 py-3.5">
      <div className="label-xs">{label}</div>
      <div className={`text-[14px] mt-1.5 ${highlight ? 'font-bold text-primary' : 'font-semibold text-ink-strong'}`}>
        {value}
      </div>
    </div>
  );
}

/**
 * The agreement is a complete HTML document with its own typography. Rendering
 * it in a sandboxed iframe keeps that formatting intact — and identical to the
 * client portal — instead of losing the body styles to innerHTML.
 */
export function AgreementDocument({ html, height = 560 }: { html: string; height?: number }) {
  return (
    <iframe
      srcDoc={html}
      title="Agreement"
      sandbox=""
      className="w-full bg-white"
      style={{ height, border: 'none', display: 'block' }}
    />
  );
}
