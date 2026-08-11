import { C, label, dot } from '../../lib/theme';
import { money, shortDate, relativeDays } from '../../lib/format';
import { usePortal, totalPaid, balanceDue, type Payment } from '../../lib/portal';
import { Screen, Card, CardTitle, Bar, Empty } from '../../components/ui';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bank: 'Bank transfer', payhere: 'PayHere', cheque: 'Cheque',
};

export default function PaymentsPage() {
  const { job } = usePortal();
  const paid = totalPaid(job.payments);
  const due = balanceDue(job);
  const percent = job.total_price > 0 ? Math.round((paid / job.total_price) * 100) : 0;

  return (
    <Screen>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={label}>Paid to date</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.green, marginTop: 6 }}>
              {money(paid)} <span style={{ fontSize: 14, color: C.muted, fontWeight: 600 }}>of {money(job.total_price)}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={label}>Remaining</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 6, color: due > 0 ? C.due : C.limeSoftText }}>
              {money(Math.max(0, due))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Bar percent={percent} />
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>{percent}% complete</div>
      </Card>

      <Card style={{ padding: 24, marginTop: 16 }}>
        <CardTitle>Schedule &amp; receipts</CardTitle>
        {job.payments.length > 0 ? (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {job.payments.map((p) => (
              <div key={p.id} style={row}>
                <span style={iconFor(p)}>{p.status === 'paid' ? '✓' : '!'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textStrong, textTransform: 'capitalize' }}>
                    {p.type} payment
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{meta(p)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.green, flexShrink: 0 }}>{money(p.amount)}</div>
                <span style={p.status === 'paid' ? paidPill : duePill}>
                  {p.status === 'paid' ? 'Paid' : 'Due'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: C.muted, marginTop: 14 }}>
            No payments have been recorded for this event yet.
          </p>
        )}
        <div style={{ fontSize: 12, color: C.muted, marginTop: 16, lineHeight: 1.5 }}>
          Payments are recorded by your studio and appear here once received. Contact them for payment instructions.
        </div>
      </Card>

      {job.total_price === 0 && job.payments.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <Empty>Pricing for this event hasn’t been finalised yet.</Empty>
        </div>
      )}
    </Screen>
  );
}

function meta(p: Payment): string {
  const parts: string[] = [];
  if (p.status === 'paid' && p.paid_at) parts.push(`Paid ${shortDate(p.paid_at)}`);
  else parts.push(`Recorded ${shortDate(p.created_at)} · ${relativeDays(p.created_at)}`);
  parts.push(METHOD_LABEL[p.method] ?? p.method);
  if (p.notes) parts.push(p.notes);
  return parts.join(' · ');
}

function iconFor(p: Payment): React.CSSProperties {
  return p.status === 'paid'
    ? dot(C.lime, C.green, 'none')
    : dot(C.amberSoft, C.amberText, `2px solid ${C.amberBorder}`);
}

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 16, padding: 14,
  border: `1px solid ${C.borderSoft}`, borderRadius: 12, background: C.panel,
};

const paidPill: React.CSSProperties = {
  background: C.limeSoft, color: C.limeSoftText, fontSize: 10.5, fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: 0.5, borderRadius: 20, padding: '3px 9px', flexShrink: 0,
};

const duePill: React.CSSProperties = { ...paidPill, background: C.amberSoft, color: C.amberText };
