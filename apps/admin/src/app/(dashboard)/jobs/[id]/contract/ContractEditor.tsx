'use client';

import { useState } from 'react';
import { saveContractDraft, sendContract, voidContract } from './actions';

type Props = {
  contractId: string;
  jobId: string;
  studioId: string;
  initialHtml: string | null;
  resolvedTemplate: string;
  status: string;
  sentAt: string | null;
  signedAt: string | null;
  signatureData: string | null;
};

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  draft:  { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  sent:   { bg: '#fefce8', color: '#854d0e', border: '#fde047' },
  signed: { bg: '#f0fdf4', color: '#166534', border: '#86efac' },
  void:   { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5' },
};

export default function ContractEditor({
  contractId, jobId, studioId,
  initialHtml, resolvedTemplate,
  status, sentAt, signedAt, signatureData,
}: Props) {
  const [tab, setTab]       = useState<'edit' | 'preview'>('edit');
  const [html, setHtml]     = useState(initialHtml ?? '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isEditable = status === 'draft';
  const badge = STATUS_STYLE[status] ?? STATUS_STYLE.draft;

  async function handleSaveDraft() {
    setLoading(true);
    setMessage('');
    const fd = new FormData();
    fd.set('content_html', html);
    const res = await saveContractDraft(contractId, jobId, studioId, fd);
    setMessage(res?.error ?? 'Draft saved.');
    setLoading(false);
  }

  async function handleSend() {
    if (!confirm('Send this contract to the client? They will be able to view and sign it.')) return;
    setLoading(true);
    setMessage('');
    const fd = new FormData();
    fd.set('content_html', html);
    const res = await sendContract(contractId, jobId, studioId, fd);
    if (res?.error) {
      setMessage(res.error);
      setLoading(false);
    }
  }

  async function handleVoid() {
    if (!confirm('Void this contract? The client will no longer be able to sign it.')) return;
    setLoading(true);
    const res = await voidContract(contractId, jobId, studioId);
    if (res?.error) {
      setMessage(res.error);
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Status banner */}
      <div style={{ background: badge.bg, border: `1px solid ${badge.border}`, borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: badge.color }}>{status}</span>
        {sentAt   && <span style={{ fontSize: 13, color: '#6b7280' }}>Sent {new Date(sentAt).toLocaleDateString('en-LK', { dateStyle: 'medium' })}</span>}
        {signedAt && (
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            · Signed {new Date(signedAt).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
            {signatureData ? ` by ${signatureData}` : ''}
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 0 }}>
        {(['edit', 'preview'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer',
              fontWeight: tab === t ? 600 : 400,
              color: tab === t ? '#0F3D2E' : '#6b7280',
              borderBottom: tab === t ? '2px solid #0F3D2E' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t === 'edit' ? 'Edit HTML' : 'Preview'}
          </button>
        ))}
      </div>

      {tab === 'edit' ? (
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          readOnly={!isEditable}
          spellCheck={false}
          style={{
            width: '100%', height: 540, border: '1px solid #d1d5db', borderTop: 'none',
            borderRadius: '0 0 6px 6px', padding: 12, fontFamily: 'monospace', fontSize: 12,
            resize: 'vertical', boxSizing: 'border-box',
            background: isEditable ? '#fff' : '#f9fafb', color: '#374151',
          }}
        />
      ) : (
        <iframe
          srcDoc={html || '<body style="font-family:sans-serif;color:#9ca3af;padding:48px;text-align:center;font-size:14px;">No content yet — click Edit HTML and use Load template.</body>'}
          style={{ width: '100%', height: 540, border: '1px solid #d1d5db', borderTop: 'none', borderRadius: '0 0 6px 6px' }}
          title="Contract preview"
          sandbox="allow-same-origin"
        />
      )}

      {message && (
        <p style={{ fontSize: 13, marginTop: 8, color: message === 'Draft saved.' ? '#16a34a' : '#dc2626' }}>
          {message}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        {isEditable && (
          <button onClick={() => setHtml(resolvedTemplate)} disabled={loading} style={ghostBtn}>
            Load template
          </button>
        )}

        <div style={{ flex: 1 }} />

        {(status === 'sent' || status === 'signed') && (
          <button onClick={handleVoid} disabled={loading} style={dangerBtn}>Void</button>
        )}
        {isEditable && (
          <>
            <button onClick={handleSaveDraft} disabled={loading} style={secondaryBtn}>Save draft</button>
            <button onClick={handleSend} disabled={loading || !html.trim()} style={primaryBtn}>
              Send to client →
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const primaryBtn:   React.CSSProperties = { height: 34, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 13 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const ghostBtn:     React.CSSProperties = { height: 34, borderRadius: 6, background: 'none', color: '#6b7280', border: '1px solid #d1d5db', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const dangerBtn:    React.CSSProperties = { height: 34, borderRadius: 6, background: 'none', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
