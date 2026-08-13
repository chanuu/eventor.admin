import { C } from '../../lib/theme';
import { money, shortDate } from '../../lib/format';
import { usePortal } from '../../lib/portal';
import { Screen, Card, CardTitle, Empty } from '../../components/ui';

export default function PackagePage() {
  const { job } = usePortal();
  const pkg = job.pkg;

  if (!pkg) {
    return (
      <Screen>
        <Empty>No package has been assigned to this event yet.</Empty>
      </Screen>
    );
  }

  // Inclusions come from the package description — one per line, as the studio wrote it.
  const inclusions = (pkg.description ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  const bookedIds = new Set(job.jobAddons.map((ja) => ja.name));
  const notBooked = job.availableAddons.filter((a) => !bookedIds.has(a.name));

  return (
    <Screen>
      <div style={banner}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.lime, fontWeight: 700, textTransform: 'uppercase' }}>
            Your booked package
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>{pkg.name}</div>
          <div style={{ fontSize: 13, color: '#cfe4d8', marginTop: 6 }}>
            Booked {shortDate(job.created_at)} · <span style={{ textTransform: 'capitalize' }}>{job.status}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{money(job.total_price)}</div>
          <div style={{ fontSize: 12, color: C.sidebarMuted }}>
            Base {money(pkg.base_price)}{job.jobAddons.length ? ` + ${job.jobAddons.length} add-on${job.jobAddons.length === 1 ? '' : 's'}` : ''}
          </div>
        </div>
      </div>

      <div className="grid-cards cols-2" style={{ marginTop: 16 }}>
        <Card>
          <CardTitle>What’s included</CardTitle>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={inclusionRow}>
              <span style={tick}>✓</span>
              <span>{pkg.shoots_included} shoot{pkg.shoots_included === 1 ? '' : 's'} included</span>
            </div>
            {inclusions.map((inc, i) => (
              <div key={i} style={inclusionRow}>
                <span style={tick}>✓</span>
                <span>{inc}</span>
              </div>
            ))}
            {inclusions.length === 0 && (
              <p style={{ fontSize: 12.5, color: C.muted }}>
                Your studio hasn’t listed the package inclusions yet.
              </p>
            )}
          </div>

          {job.jobAddons.length > 0 && (
            <>
              <div style={{ height: 1, background: C.borderSoft, margin: '20px 0' }} />
              <CardTitle>Add-ons on your booking</CardTitle>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {job.jobAddons.map((ja) => (
                  <div key={ja.id} style={addonRow}>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textStrong }}>{ja.name}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Quantity {ja.quantity}</div>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: C.green }}>
                      {money(ja.price_at_booking * ja.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card>
          <CardTitle>Available add-ons</CardTitle>
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {notBooked.map((a) => (
              <div key={a.id} style={addonRow}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textStrong }}>{a.name}</div>
                  {a.description && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{a.description}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: C.green }}>{money(a.price)}</div>
                </div>
              </div>
            ))}
            {notBooked.length === 0 && (
              <p style={{ fontSize: 12.5, color: C.muted }}>
                No further add-ons are offered for this package.
              </p>
            )}
          </div>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 14, lineHeight: 1.5 }}>
            Interested in one of these? Contact your studio and they’ll add it to your booking.
          </p>
        </Card>
      </div>
    </Screen>
  );
}

const banner: React.CSSProperties = {
  background: C.green, borderRadius: 18, padding: 28, color: C.white,
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 14,
};

const inclusionRow: React.CSSProperties = { display: 'flex', gap: 10, fontSize: 13.5, color: C.textBody };
const tick: React.CSSProperties = { color: C.lime, fontWeight: 800 };

const addonRow: React.CSSProperties = {
  border: `1px solid ${C.borderSoft}`, background: C.panel, borderRadius: 12, padding: 14,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
};
