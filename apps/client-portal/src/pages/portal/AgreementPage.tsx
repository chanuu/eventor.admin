import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { C, solidBtn, ghostBtn, label } from '../../lib/theme';
import { money, shortDate } from '../../lib/format';
import { usePortal, totalPaid } from '../../lib/portal';
import { Screen, Card, CardTitle, Empty, Toast } from '../../components/ui';

export default function AgreementPage() {
  const { job, reload } = usePortal();
  const contract = job.contract;

  const [showFull, setShowFull] = useState(false);
  const [signature, setSignature] = useState('');
  const [signing, setSigning] = useState(false);
  const [toast, setToast] = useState('');

  if (!contract) {
    return (
      <Screen>
        <Empty>Your studio hasn’t prepared an agreement for this event yet.</Empty>
      </Screen>
    );
  }

  const signed = contract.status === 'signed';
  const awaitingSignature = contract.status === 'sent';

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();
    if (!contract || !signature.trim()) return;
    setSigning(true);
    const { error } = await supabase
      .from('contracts')
      .update({ status: 'signed', signature_data: signature.trim(), signed_at: new Date().toISOString() })
      .eq('id', contract.id);
    setSigning(false);
    if (error) { setToast(`Could not sign: ${error.message}`); return; }
    setToast('Agreement signed. A copy stays available here.');
    reload();
  }

  // ── Full document view ──
  if (showFull) {
    return (
      <Screen>
        <div style={fullBar}>
          <button onClick={() => setShowFull(false)} style={{ ...ghostBtn, padding: '10px 18px' }}>
            ← Back to Agreement
          </button>
          <div style={{ fontSize: 12.5, color: C.muted }}>
            {signed ? `Signed ${shortDate(contract.signed_at)} · read-only copy` : 'Draft copy'}
          </div>
        </div>
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden', marginTop: 14, background: C.white }}>
          {contract.content_html ? (
            // Studio-authored HTML, not client input.
            <div style={documentBody} dangerouslySetInnerHTML={{ __html: contract.content_html }} />
          ) : (
            <p style={{ ...documentBody, color: C.muted, fontStyle: 'italic' }}>
              Your studio is still drafting this agreement.
            </p>
          )}
        </div>
        {toast && <Toast message={toast} />}
      </Screen>
    );
  }

  // ── Summary view ──
  return (
    <Screen>
      <Card style={{ padding: 26, display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={docIcon}>📄</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: C.green }}>Photography Service Agreement</div>
          <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 4 }}>
            {signed
              ? `Signed by ${contract.signature_data ?? 'you'} on ${shortDate(contract.signed_at)}`
              : awaitingSignature ? 'Sent to you — awaiting your signature'
              : `Status: ${contract.status}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button onClick={() => setShowFull(true)} style={{ ...solidBtn, padding: '11px 20px' }}>Open agreement</button>
          <button onClick={() => window.print()} style={{ ...ghostBtn, padding: '11px 20px' }}>Print / PDF</button>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={label}>Package value</div>
          <div style={fact}>{money(job.total_price)}</div>
          <div style={factNote}>{job.pkg?.name ?? 'No package assigned'}</div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={label}>Paid to date</div>
          <div style={fact}>{money(totalPaid(job.payments))}</div>
          <div style={factNote}>
            {job.payments.filter((p) => p.status === 'paid').length} payment(s) received
          </div>
        </Card>
        <Card style={{ padding: 20 }}>
          <div style={label}>Agreement status</div>
          <div style={{ ...fact, textTransform: 'capitalize' }}>{contract.status}</div>
          <div style={factNote}>
            {signed ? `Signed ${shortDate(contract.signed_at)}` : `Created ${shortDate(contract.created_at)}`}
          </div>
        </Card>
      </div>

      {awaitingSignature && (
        <Card style={{ padding: 22, marginTop: 16 }}>
          <CardTitle>Sign this agreement</CardTitle>
          <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6 }}>
            Read the full agreement, then type your full name below to sign. This is legally equivalent to signing by hand.
          </p>
          <form onSubmit={handleSign} style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <input
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name"
              required
              style={signInput}
            />
            <button type="submit" disabled={signing || !signature.trim()} style={{
              ...solidBtn, padding: '11px 22px',
              ...(signature.trim() ? {} : { background: '#DDE3DE', color: C.muted, cursor: 'not-allowed' }),
            }}>
              {signing ? 'Signing…' : 'Sign agreement'}
            </button>
          </form>
        </Card>
      )}

      {signed && (
        <div style={signedBanner}>
          <span style={signedTick}>✓</span>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.green }}>Agreement signed</div>
            <div style={{ fontSize: 12.5, color: C.limeSoftText, marginTop: 3 }}>
              A read-only copy stays here for your records.
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} />}
    </Screen>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const docIcon: React.CSSProperties = {
  width: 52, height: 52, borderRadius: 14, background: C.limeSoft, border: `1px solid ${C.limeSoftBorder}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
};

const fact: React.CSSProperties = { fontSize: 15, fontWeight: 800, color: C.green, marginTop: 8 };
const factNote: React.CSSProperties = { fontSize: 12, color: C.muted, marginTop: 4 };

const fullBar: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
  background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 18px',
};

const documentBody: React.CSSProperties = {
  padding: '32px 40px', lineHeight: 1.8, fontSize: 14, color: C.textBody,
};

const signInput: React.CSSProperties = {
  flex: 1, minWidth: 220, height: 42, borderRadius: 9, border: `1px solid ${C.borderBtn}`,
  padding: '0 14px', fontSize: 15, fontStyle: 'italic', fontFamily: 'inherit', color: C.textStrong,
};

const signedBanner: React.CSSProperties = {
  background: C.limeSoft, border: `1px solid ${C.limeSoftBorder}`, borderRadius: 16, padding: 22,
  marginTop: 16, display: 'flex', gap: 14, alignItems: 'center',
};

const signedTick: React.CSSProperties = {
  width: 26, height: 26, borderRadius: '50%', background: C.lime, color: C.green,
  fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};
