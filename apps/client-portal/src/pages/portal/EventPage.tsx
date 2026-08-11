import { C } from '../../lib/theme';
import { shortDate, timeOnly } from '../../lib/format';
import { usePortal, eventDate } from '../../lib/portal';
import { Screen, Card, CardTitle, Field, Empty } from '../../components/ui';

export default function EventPage() {
  const { job } = usePortal();
  const evDate = eventDate(job.shoots);
  const mainShoot = job.shoots.find((s) => s.scheduled_at === evDate) ?? job.shoots[0] ?? null;
  const venue = job.shoots.find((s) => s.venue)?.venue ?? null;
  const crew = Array.from(new Set(job.shoots.flatMap((s) => s.crew)));

  // The design's day-of timeline maps to the shoots the studio scheduled for this job.
  const timeline = job.shoots.filter((s) => s.scheduled_at);

  return (
    <Screen>
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card style={{ padding: 24 }}>
          <CardTitle>Event details</CardTitle>
          <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
            <Field name="Event type" value={job.event_type ?? '—'} />
            <Field name="Date" value={evDate ? shortDate(evDate) : 'To be confirmed'} />
            <Field name="Package" value={job.pkg?.name ?? 'Not assigned'} />
            <Field name="Venue" value={venue ?? 'To be confirmed'} />
            <Field name="Sessions" value={`${job.shoots.length} booked`} />
            <Field name="Crew" value={crew.length ? crew.join(', ') : 'Being assigned'} />
          </div>

          <div style={{ height: 1, background: C.borderSoft, margin: '24px 0' }} />

          <CardTitle>Day-of timeline</CardTitle>
          {timeline.length > 0 ? (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {timeline.map((t) => (
                <div key={t.id} style={timelineRow}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.green, width: 74, flexShrink: 0 }}>
                    {timeOnly(t.scheduled_at)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textStrong }}>{t.shoot_type ?? 'Shoot'}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {[shortDate(t.scheduled_at), t.venue].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 12.5, color: C.muted, marginTop: 12 }}>
              Your studio hasn’t scheduled any sessions yet. They’ll appear here once they do.
            </p>
          )}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardTitle>Venue</CardTitle>
            {venue ? (
              <>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textStrong, marginTop: 14 }}>{venue}</div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue)}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: 'inline-block', marginTop: 10, fontSize: 12.5, fontWeight: 700 }}
                >
                  Open in Maps →
                </a>
              </>
            ) : (
              <p style={{ fontSize: 12.5, color: C.muted, marginTop: 12 }}>Venue not confirmed yet.</p>
            )}
          </Card>

          {job.notes && (
            <Card>
              <CardTitle>Notes from your studio</CardTitle>
              <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {job.notes}
              </p>
            </Card>
          )}

          {mainShoot?.notes && (
            <Card>
              <CardTitle>Session notes</CardTitle>
              <p style={{ fontSize: 12.5, color: C.textMid, marginTop: 8, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {mainShoot.notes}
              </p>
            </Card>
          )}
        </div>
      </div>

      {job.shoots.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <Empty>Once your studio schedules the shoots for this event, the full timeline appears here.</Empty>
        </div>
      )}
    </Screen>
  );
}

const timelineRow: React.CSSProperties = {
  display: 'flex', gap: 16, alignItems: 'center', background: C.panel,
  border: `1px solid ${C.borderSoft}`, borderRadius: 10, padding: '12px 14px',
};
