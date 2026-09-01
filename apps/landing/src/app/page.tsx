import Hero from '@/components/Hero';
import {
  ACCENT, IMG, GAL_COVERS, THUMBS, NAV_LINKS, STRIP, ALBUM_POINTS, GALLERY_DEFS,
  CRM_POINTS, PIPELINE, PROOF_POINTS, PAYMENT_ROWS, SCHEDULE_ROWS, PLANS, FOOTER_COLS,
} from '@/lib/content';

export default function LandingPage() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? '#pricing';
  const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? '#pricing';

  return (
    <div style={{ background: '#EDEDED', color: '#111614', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 60, background: '#EDEDEDF2', backdropFilter: 'blur(8px)', borderBottom: '1px solid #E0E0E0' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '16px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: 0.5 }}>
            Ev<span style={{ color: '#8BC53F' }}>e</span>ntor
          </div>
          <nav style={{ display: 'flex', gap: 16, fontSize: 11.5, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase', color: '#2b332f', flex: '1 1 auto', minWidth: 0, justifyContent: 'flex-end', overflowX: 'auto', scrollbarWidth: 'none', padding: '2px 0' }}>
            {NAV_LINKS.map(([href, label]) => (
              <a key={href} href={href} style={{ color: '#2b332f', whiteSpace: 'nowrap' }}>{label}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
            <a href={adminUrl} style={{ background: '#0F5344', color: '#ffffff', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '12px 22px', whiteSpace: 'nowrap' }}>Sign in</a>
            <a href="/get-started" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#2b332f', whiteSpace: 'nowrap' }}>Sign up</a>
          </div>
        </div>
      </div>

      <Hero signInHref="#pricing" />

      {/* ── FEATURE STRIP ── */}
      <div style={{ background: '#111614', color: '#ffffff' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '34px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 24 }}>
          {STRIP.map((s) => (
            <div key={s.tag} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: '#8BC53F' }}>{s.tag}</div>
              <div style={{ fontSize: 13.5, color: '#cfd4d1', lineHeight: 1.5 }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── VIRTUAL ALBUM ── */}
      <div id="album" style={{ background: '#F5F5F5', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={h2}>Online Virtual Album</div>
          <div style={sub}>Stand out from the crowd and impress your clients with custom-designed photo galleries.</div>

          <div className="split-13" style={{ display: 'grid', gap: 60, alignItems: 'center', marginTop: 56 }}>
            <div style={{ backgroundImage: 'url(/assets/album-hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: '16 / 11' }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.35 }}>
                Eventor is a simple and powerful album builder for photographers
              </div>
              <div style={{ fontSize: 14, color: '#6b736e', lineHeight: 1.8, marginTop: 18 }}>
                Every layout is handcrafted, so thousands of professionally-designed spreads are at your fingertips.
                Clients flip through the real thing — page curl, background music, full screen — from any device.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
                {ALBUM_POINTS.map((p) => (
                  <div key={p} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#2b332f' }}>
                    <span style={{ color: '#0F5344', fontWeight: 800 }}>✓</span><span>{p}</span>
                  </div>
                ))}
              </div>
              <a href="/get-started" style={{ display: 'inline-block', background: '#0F5344', color: '#ffffff', fontSize: 14, fontWeight: 600, padding: '15px 32px', marginTop: 28 }}>
                Subscribe Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── GALLERIES ── */}
      <div id="galleries" style={{ background: '#ffffff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', textAlign: 'center' }}>
          <div style={h2}>Customize Your Photo Gallery</div>
          <div style={sub}>Three ready-made gallery styles, each fully brandable to your studio.</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24, marginTop: 56, textAlign: 'left' }}>
            {GALLERY_DEFS.map((g, i) => (
              <div key={g.couple} style={{ background: g.dark ? '#141816' : '#ffffff', boxShadow: '0 18px 40px rgba(17,22,20,0.10)', overflow: 'hidden' }}>
                <div style={{ position: 'relative', height: 150, overflow: 'hidden' }}>
                  <div style={{
                    width: '100%', height: '100%',
                    backgroundImage: `url(${IMG(GAL_COVERS[i], 700)})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    filter: i === 2 ? 'grayscale(1)' : undefined,
                  }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(17,22,20,0.32)' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#ffffff' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>{g.couple}</div>
                    <div style={{ fontSize: 9.5, letterSpacing: 1.4, opacity: 0.85 }}>{g.date}</div>
                    <div style={{ border: '1px solid rgba(255,255,255,0.7)', fontSize: 8.5, letterSpacing: 1.4, textTransform: 'uppercase', padding: '5px 12px', marginTop: 4 }}>View gallery</div>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 13px',
                  color: g.dark ? '#ffffff' : '#111614',
                  borderBottom: g.dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid #EFEFEF',
                }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>{g.couple}</div>
                    <div style={{ fontSize: 7.5, letterSpacing: 1, opacity: 0.6, marginTop: 2 }}>Eventor Studio Photography</div>
                  </div>
                  <div style={{ display: 'flex', gap: 9, fontSize: 10, opacity: 0.6 }}>
                    <span>↓</span><span>❐</span><span>▷</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, padding: 13 }}>
                  {THUMBS.map((t) => (
                    <div key={t} style={{
                      backgroundImage: `url(${IMG(t, 300)})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      aspectRatio: '1 / 1', filter: g.dark ? 'grayscale(1)' : undefined,
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CRM ── */}
      <div id="crm" style={{ background: '#EDEDED', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="split-112" style={{ display: 'grid', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={kicker}>Studio CRM</div>
              <div style={h3}>Every enquiry, event and client in one pipeline</div>
              <div style={body}>
                Track leads from first message to signed agreement. Eventor keeps the event brief, crew assignment,
                shot list and client contact together, so nothing gets lost in chat threads.
              </div>
              <div className="pair" style={{ display: 'grid', gap: 16, marginTop: 30 }}>
                {CRM_POINTS.map((c) => (
                  <div key={c.title} style={{ background: '#ffffff', padding: 18 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.title}</div>
                    <div style={{ fontSize: 12.5, color: '#6b736e', marginTop: 5, lineHeight: 1.55 }}>{c.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 22, boxShadow: '0 24px 50px rgba(17,22,20,0.10)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EDEFEC', paddingBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>Pipeline · August</div>
                <div style={{ fontSize: 11, color: '#8b938f' }}>14 active events</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
                {PIPELINE.map((p, i) => (
                  <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: '#FAFAFA', border: '1px solid #EFEFEF' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      backgroundImage: `url(${IMG(THUMBS[i], 120)})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      filter: 'grayscale(1)',
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: '#8b938f', marginTop: 2 }}>{p.meta}</div>
                    </div>
                    <span style={badge(p.bg, p.fg)}>{p.stage}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PROOFING ── */}
      <div id="proofing" style={{ background: '#111614', color: '#ffffff', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div className="split-115" style={{ display: 'grid', gap: 60, alignItems: 'center' }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {THUMBS.map((t, i) => {
                  const on = i % 3 !== 2;
                  return (
                    <div key={t} style={{
                      position: 'relative', aspectRatio: '1 / 1',
                      backgroundImage: `url(${IMG(t, 320)})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      boxShadow: on ? 'inset 0 0 0 3px #8BC53F' : undefined,
                      filter: on ? undefined : 'grayscale(1) brightness(0.7)',
                    }}>
                      {on && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: '50%',
                          background: '#8BC53F', color: '#0F3D2E', fontSize: 11, fontWeight: 800,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✓</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18 }}>
                <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.14)' }}>
                  <div style={{ width: '62%', height: '100%', background: '#8BC53F' }} />
                </div>
                <div style={{ fontSize: 11.5, color: '#a9b1ad', whiteSpace: 'nowrap' }}>19 of 30 chosen</div>
              </div>
            </div>

            <div>
              <div style={{ ...kicker, color: '#8BC53F' }}>Photo proofing</div>
              <div style={h3}>Let clients pick the album photos themselves</div>
              <div style={{ ...body, color: '#b9c0bc' }}>
                Upload a proof collection, set how many selections you need and a deadline. Clients tap their favourites,
                leave retouch notes per photo and submit — you start designing with an approved list, not a WhatsApp thread.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 22 }}>
                {PROOF_POINTS.map((p) => (
                  <div key={p} style={{ display: 'flex', gap: 10, fontSize: 13.5, color: '#e2e6e4' }}>
                    <span style={{ color: '#8BC53F', fontWeight: 800 }}>✓</span><span>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── PAYMENTS + SCHEDULE ── */}
      <div id="payments" style={{ background: '#F5F5F5', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={h2}>Payments &amp; Schedule Management</div>
            <div style={sub}>Deposits, balances and shoot days handled without spreadsheets.</div>
          </div>

          <div className="pair" style={{ display: 'grid', gap: 24, marginTop: 52 }}>
            <div style={{ background: '#ffffff', padding: 30 }}>
              <div style={{ ...kicker, letterSpacing: 2 }}>Payments</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Get paid on schedule</div>
              <div style={{ fontSize: 13.5, color: '#6b736e', lineHeight: 1.7, marginTop: 10 }}>
                Split any package into deposit and balance, send reminders automatically, and let clients pay by card,
                bank transfer or eZ Cash. Receipts land in their portal instantly.
              </div>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PAYMENT_ROWS.map((r) => (
                  <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#FAFAFA', border: '1px solid #EFEFEF' }}>
                    <span style={dot(r.bg, r.fg, r.border)}>{r.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.label}</div>
                      <div style={{ fontSize: 11, color: '#8b938f', marginTop: 2 }}>{r.meta}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{r.amount}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#ffffff', padding: 30 }}>
              <div style={{ ...kicker, letterSpacing: 2 }}>Scheduling</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>Never double-book a crew</div>
              <div style={{ fontSize: 13.5, color: '#6b736e', lineHeight: 1.7, marginTop: 10 }}>
                See every shoot, second shooter and editing deadline on one calendar. Clients get the day-of timeline
                in their portal and calendar invites for every session.
              </div>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {SCHEDULE_ROWS.map((r) => (
                  <div key={r.title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, background: '#FAFAFA', border: '1px solid #EFEFEF' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#0F5344', width: 62, flexShrink: 0 }}>{r.date}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: '#8b938f', marginTop: 2 }}>{r.meta}</div>
                    </div>
                    <span style={badge(r.bg, r.fg)}>{r.crew}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CLIENT PORTAL ── */}
      <div id="portal" style={{ background: '#ffffff', padding: '96px 32px' }}>
        <div className="pair" style={{ maxWidth: 1160, margin: '0 auto', display: 'grid', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={kicker}>Client portal</div>
            <div style={h3}>One link your client will actually use</div>
            <div style={body}>
              Agreements, payment status, shoot schedule, proofing and the digital album — all behind a single private
              link, branded as your studio. No app to install.
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 28, flexWrap: 'wrap' }}>
              <a href={portalUrl} style={{ background: '#0F5344', color: '#ffffff', fontSize: 14, fontWeight: 600, padding: '15px 30px' }}>Open live demo</a>
              <a href="#album" style={{ border: '1px solid #B9BEBB', color: '#111614', fontSize: 14, fontWeight: 600, padding: '15px 30px' }}>Flip an album</a>
            </div>
          </div>
          <div style={{ backgroundImage: 'url(/assets/portal-couple.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', aspectRatio: '4 / 3' }} />
        </div>
      </div>

      {/* ── PRICING ── */}
      <div id="pricing" style={{ background: '#EDEDED', padding: '96px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', textAlign: 'center' }}>
          <div style={h2}>Simple Studio Pricing</div>
          <div style={sub}>Billed monthly in LKR. Cancel any time.</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24, marginTop: 52, textAlign: 'left' }}>
            {PLANS.map((p) => (
              <div key={p.name} style={{
                padding: '32px 28px', display: 'flex', flexDirection: 'column',
                ...(p.dark
                  ? { background: '#111614', color: '#ffffff', boxShadow: '0 26px 54px rgba(17,22,20,0.22)' }
                  : { background: '#ffffff', color: '#111614' }),
              }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: p.dark ? '#8BC53F' : ACCENT }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 14, whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 'clamp(24px,2.6vw,34px)', fontWeight: 800, whiteSpace: 'nowrap' }}>{p.price}</div>
                  <div style={{ fontSize: 12.5, color: p.dark ? '#a9b1ad' : '#8b938f' }}>/ month</div>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, marginTop: 10, color: p.dark ? '#b9c0bc' : '#6b736e' }}>{p.desc}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 22 }}>
                  {p.features.map((f) => (
                    <div key={f} style={{ display: 'flex', gap: 9, fontSize: 13, color: p.dark ? '#e2e6e4' : '#2b332f' }}>
                      <span style={{ color: '#8BC53F', fontWeight: 800 }}>✓</span><span>{f}</span>
                    </div>
                  ))}
                </div>
                <a href={`/get-started?plan=${p.name.toLowerCase()}`} style={{
                  marginTop: 28, textAlign: 'center', fontSize: 13.5, fontWeight: 700, padding: 14,
                  ...(p.dark ? { background: '#8BC53F', color: '#0F3D2E' } : { background: ACCENT, color: '#ffffff' }),
                }}>
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ position: 'relative', padding: '110px 32px', overflow: 'hidden', background: '#111614' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${IMG('photo-1465495976277-4387d4b0b4c6', 1800)})`,
          backgroundSize: 'cover', backgroundPosition: 'center', filter: 'grayscale(1)', opacity: 0.34,
        }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto', textAlign: 'center', color: '#ffffff' }}>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.15, letterSpacing: -0.8 }}>
            Run your whole studio from one place
          </div>
          <div style={{ fontSize: 15.5, color: '#cfd4d1', marginTop: 16, lineHeight: 1.7 }}>
            Start free for 14 days. Import your current bookings and send your first client portal today.
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 32, flexWrap: 'wrap' }}>
            <a href="/get-started" style={{ background: '#8BC53F', color: '#0F3D2E', fontSize: 14, fontWeight: 700, padding: '16px 34px' }}>Subscribe Now</a>
            <a href="#pricing" style={{ border: '1px solid rgba(255,255,255,0.5)', color: '#ffffff', fontSize: 14, fontWeight: 600, padding: '16px 34px' }}>Talk to us</a>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#0B0F0D', color: '#8b938f', padding: '52px 32px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', justifyContent: 'space-between', gap: 30, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ffffff' }}>
              Ev<span style={{ color: '#8BC53F' }}>e</span>ntor
            </div>
            <div style={{ fontSize: 12.5, marginTop: 10, lineHeight: 1.7 }}>
              Photography studio platform<br />Colombo, Sri Lanka
            </div>
          </div>
          <div style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }}>
            {FOOTER_COLS.map((col) => (
              <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: '#ffffff' }}>{col.title}</div>
                {col.links.map((l) => (
                  <a key={l} href="#pricing" style={{ fontSize: 12.5, color: '#8b938f' }}>{l}</a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth: 1160, margin: '36px auto 0', borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: 20, fontSize: 11.5 }}>
          © 2026 Eventor. All rights reserved.
        </div>
      </div>
    </div>
  );
}

// ─── Shared type scale from the design ───────────────────────────────────────

const h2: React.CSSProperties = { fontSize: 42, fontWeight: 800, letterSpacing: -0.6 };
const h3: React.CSSProperties = { fontSize: 40, fontWeight: 800, lineHeight: 1.15, marginTop: 16, letterSpacing: -0.6 };
const sub: React.CSSProperties = { fontSize: 15, color: '#6b736e', marginTop: 12 };
const kicker: React.CSSProperties = { fontSize: 11.5, fontWeight: 700, letterSpacing: 2.4, textTransform: 'uppercase', color: '#0F5344' };
const body: React.CSSProperties = { fontSize: 14.5, color: '#5b6360', lineHeight: 1.75, marginTop: 18 };

function badge(bg: string, fg: string): React.CSSProperties {
  return {
    background: bg, color: fg, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.8,
    textTransform: 'uppercase', padding: '4px 9px', whiteSpace: 'nowrap',
  };
}

function dot(bg: string, fg: string, border: string): React.CSSProperties {
  return {
    width: 26, height: 26, borderRadius: '50%', background: bg, color: fg, border,
    fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };
}
