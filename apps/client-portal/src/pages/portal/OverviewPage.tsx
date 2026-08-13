import { Link, useNavigate } from 'react-router-dom';
import { C, card, solidBtn, ghostBtn, label, dot } from '../../lib/theme';
import { money, shortDate, dateTime, relativeDays } from '../../lib/format';
import {
  usePortal, balanceDue, totalPaid, nextShoot, eventDate, photoUrl,
  galleriesVisible, proofingGalleries,
} from '../../lib/portal';
import { Screen, Card, CardTitle, Empty } from '../../components/ui';

export default function OverviewPage() {
  const { job } = usePortal();
  const navigate = useNavigate();
  const base = `/portal/${job.id}`;

  const due = balanceDue(job);
  const paid = totalPaid(job.payments);
  const next = nextShoot(job.shoots);
  const evDate = eventDate(job.shoots);
  const contract = job.contract;

  const visible = galleriesVisible(job);
  const latest = visible.find((g) => g.photos.length > 0) ?? null;
  const heroPhoto = latest?.photos[0];

  const proofing = proofingGalleries(job);
  const proofPhotos = proofing.flatMap((g) => g.photos);
  const proofSelected = proofPhotos.filter((p) => p.is_selected).length;

  const venue = job.shoots.find((s) => s.venue)?.venue;

  return (
    <Screen>
      {/* ── Hero ── */}
      <div style={hero}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {heroPhoto
            ? <img src={photoUrl(heroPhoto.storage_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', background: C.green }} />}
          <div style={heroScrim} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, letterSpacing: 2, color: C.lime, fontWeight: 700, textTransform: 'uppercase' }}>
            {job.event_type ?? 'Event'}{evDate ? ` · ${shortDate(evDate)}` : ''}
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{job.title}</div>
          <div style={{ fontSize: 13.5, color: '#cfe4d8', marginTop: 6 }}>
            {[venue, job.pkg?.name].filter(Boolean).join(' · ') || 'Your event with us'}
          </div>
        </div>
      </div>

      {/* ── Three stat cards ── */}
      <div className="grid-cards" style={{ marginTop: 18 }}>
        <div style={card}>
          <div style={label}>Balance due</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.green, marginTop: 8 }}>{money(Math.max(0, due))}</div>
          <div style={{ fontSize: 12.5, color: due > 0 ? C.due : C.limeSoftText, marginTop: 4 }}>
            {due > 0 ? `${money(paid)} paid so far` : 'Fully paid — thank you'}
          </div>
          <button onClick={() => navigate(`${base}/payments`)} style={{ ...solidBtn, marginTop: 14, width: '100%', padding: 10 }}>
            {due > 0 ? 'View payments' : 'View receipts'}
          </button>
        </div>

        <div style={card}>
          <div style={label}>Next shoot</div>
          {next ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.green, marginTop: 8 }}>
                {next.shoot_type ?? 'Shoot'}
              </div>
              <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 4 }}>
                {dateTime(next.scheduled_at)}{next.venue ? <><br />{next.venue}</> : null}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 8 }}>No shoots scheduled yet.</div>
          )}
          <button onClick={() => navigate(`${base}/shoots`)} style={{ ...ghostBtn, marginTop: 14, width: '100%', padding: 10 }}>
            View schedule
          </button>
        </div>

        <div style={card}>
          <div style={label}>Agreement</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
            <span style={dot(
              contract?.status === 'signed' ? C.lime : C.white,
              contract?.status === 'signed' ? C.green : C.muted,
              contract?.status === 'signed' ? 'none' : `2px solid ${C.borderSoft}`,
            )}>
              {contract?.status === 'signed' ? '✓' : ''}
            </span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.green, textTransform: 'capitalize' }}>
              {contract ? contract.status : 'Not sent'}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: C.textMid, marginTop: 6 }}>
            {contract?.signed_at ? `Accepted on ${shortDate(contract.signed_at)}`
              : contract?.status === 'sent' ? 'Waiting for your signature'
              : 'Your studio will share it here'}
          </div>
          <button onClick={() => navigate(`${base}/agreement`)} style={{ ...ghostBtn, marginTop: 14, width: '100%', padding: 10 }}>
            Open agreement
          </button>
        </div>
      </div>

      {/* ── Proofing call to action ── */}
      {proofing.length > 0 && (
        <div style={ctaBanner}>
          <div style={ctaIcon}>☑</div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>Your album proofs are ready</div>
            <div style={{ fontSize: 12.5, color: '#cfe4d8', marginTop: 4 }}>
              Pick your favourites from {proofPhotos.length} proof{proofPhotos.length === 1 ? '' : 's'} so we can start
              designing — {proofSelected} chosen so far.
            </div>
          </div>
          <button onClick={() => navigate(`${base}/proofing`)} style={ctaBtn}>Start proofing</button>
        </div>
      )}

      {/* ── Journey + latest gallery ── */}
      <div className="grid-split" style={{ marginTop: 16 }}>
        <Card>
          <CardTitle>Your journey</CardTitle>
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
            {buildJourney(job).map((step, i, all) => (
              <div key={i} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                  <span style={step.done ? dot(C.lime, C.green, 'none')
                    : step.current ? dot(C.white, C.green, `3px solid ${C.lime}`)
                    : dot(C.white, C.muted, '2px solid #E0E5E1')}>
                    {step.done ? '✓' : ''}
                  </span>
                  {i < all.length - 1 && (
                    <span style={{ width: 2, flex: 1, background: step.done ? C.lime : C.border, minHeight: 14 }} />
                  )}
                </div>
                <div style={{ paddingBottom: 18 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: C.textStrong }}>{step.title}</div>
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>{step.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle right={
            <Link to={`${base}/gallery`} style={{ color: C.textMid, fontSize: 12, fontWeight: 600 }}>See all</Link>
          }>
            Latest gallery
          </CardTitle>
          {latest ? (
            <>
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {latest.photos.slice(0, 4).map((p) => (
                  <img key={p.id} src={photoUrl(p.storage_path)} alt=""
                    style={{ width: '100%', height: 84, objectFit: 'cover', borderRadius: 10 }} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 12 }}>
                {latest.title} · {latest.photos.length} photo{latest.photos.length === 1 ? '' : 's'} · {shortDate(latest.created_at)}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 14 }}>
              No photos have been shared with you yet.
            </div>
          )}
        </Card>
      </div>

      {visible.length === 0 && proofing.length === 0 && job.shoots.length === 0 && (
        <div style={{ marginTop: 16 }}>
          <Empty>Your studio is still setting up this event. Details will appear here as they’re added.</Empty>
        </div>
      )}
    </Screen>
  );
}

/** The journey milestones are derived from real records, not a stored checklist. */
function buildJourney(job: ReturnType<typeof usePortal>['job']) {
  const steps: { title: string; meta: string; done: boolean; current?: boolean }[] = [];

  steps.push({ title: 'Enquiry & package chosen', meta: shortDate(job.created_at), done: true });

  if (job.contract) {
    const signed = job.contract.status === 'signed';
    steps.push({
      title: signed ? 'Agreement signed' : 'Agreement sent for signature',
      meta: signed ? shortDate(job.contract.signed_at) : 'Awaiting your signature',
      done: signed, current: !signed,
    });
  }

  for (const p of job.payments) {
    const isPaid = p.status === 'paid';
    steps.push({
      title: `${p.type.charAt(0).toUpperCase() + p.type.slice(1)} ${isPaid ? 'paid' : 'due'} — ${money(p.amount)}`,
      meta: isPaid ? shortDate(p.paid_at) : `${p.method} · not yet received`,
      done: isPaid, current: !isPaid,
    });
  }

  for (const s of job.shoots) {
    const past = s.scheduled_at ? new Date(s.scheduled_at).getTime() < Date.now() : false;
    steps.push({
      title: s.shoot_type ?? 'Shoot',
      meta: s.scheduled_at ? `${shortDate(s.scheduled_at)} · ${past ? 'completed' : relativeDays(s.scheduled_at)}` : 'To be scheduled',
      done: past || s.status === 'done',
      current: !past && s.status === 'scheduled',
    });
  }

  const delivered = galleriesVisible(job).filter((g) => g.status === 'delivered');
  if (delivered.length) {
    steps.push({ title: 'Gallery delivered', meta: shortDate(delivered[0].created_at), done: true });
  }

  return steps;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const hero: React.CSSProperties = {
  position: 'relative', borderRadius: 20, overflow: 'hidden', color: C.white,
  padding: 34, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
};

const heroScrim: React.CSSProperties = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  background: 'linear-gradient(180deg,rgba(15,61,46,0.35),rgba(15,61,46,0.92))',
};

const ctaBanner: React.CSSProperties = {
  background: C.green, borderRadius: 16, padding: 22, marginTop: 16,
  display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', color: C.white,
};

const ctaIcon: React.CSSProperties = {
  width: 44, height: 44, borderRadius: 12, background: C.lime, color: C.green,
  fontSize: 20, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const ctaBtn: React.CSSProperties = {
  background: C.lime, color: C.green, border: 'none', borderRadius: 9, padding: '12px 22px',
  fontSize: 12.5, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
};
