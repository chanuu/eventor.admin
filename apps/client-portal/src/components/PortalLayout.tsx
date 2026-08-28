import { useCallback, useEffect, useState } from 'react';
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { C, FONT } from '../lib/theme';
import { daysUntil } from '../lib/format';
import { prettyPhone } from '../lib/phone';
import {
  PortalContext, fetchPortalJob, fetchJobOptions, balanceDue, eventDate, proofingGalleries,
  type PortalJob,
} from '../lib/portal';

const NAV = [
  { to: 'overview',  label: 'Overview',  icon: '◈' },
  { to: 'event',     label: 'My Event',  icon: '◷' },
  { to: 'shoots',    label: 'Shoots',    icon: '◎' },
  { to: 'package',   label: 'Package',   icon: '❑' },
  { to: 'payments',  label: 'Payments',  icon: '₨' },
  { to: 'gallery',   label: 'Gallery',   icon: '❖' },
  { to: 'proofing',  label: 'Proofing',  icon: '☑' },
  { to: 'album',     label: 'Album',     icon: '📖' },
  { to: 'agreement', label: 'Agreement', icon: '✎' },
];

const TITLES: Record<string, [string, string]> = {
  event: ['My Event', ''],
  shoots: ['Shoots', 'Sessions booked under this event'],
  package: ['Package', 'What you booked and what you can add'],
  payments: ['Payments', 'Schedule, receipts and outstanding balance'],
  gallery: ['Gallery', 'Your delivered photographs'],
  proofing: ['Photo Proofing', 'Choose and approve photos before your album is designed'],
  album: ['Digital Album', 'Flip through your finished album and share it'],
  agreement: ['Agreement', 'Your signed photography service agreement'],
};

export default function PortalLayout({ user }: { user: User }) {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [job, setJob] = useState<PortalJob | null>(null);
  const [jobOptions, setJobOptions] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 900 : false,
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Close the drawer whenever navigation happens.
  useEffect(() => { setNavOpen(false); }, [pathname]);

  // Don't let the page scroll behind an open drawer.
  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [navOpen]);

  const load = useCallback(() => {
    if (!jobId) return;
    Promise.all([fetchPortalJob(jobId), fetchJobOptions()]).then(([j, opts]) => {
      setJob(j);
      setJobOptions(opts);
      setLoading(false);
    });
  }, [jobId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  if (loading) return <div style={{ ...pageBase, padding: 40, color: C.muted }}>Loading your portal…</div>;
  if (!job) {
    return (
      <div style={{ ...pageBase, padding: 40, color: C.muted }}>
        We couldn’t find this event. <button onClick={() => navigate('/')} style={linkBtn}>Go back</button>
      </div>
    );
  }

  const section = pathname.split('/')[3] ?? 'overview';
  const [title, sub] = TITLES[section] ?? [`Welcome back, ${job.clientName.split(' ')[0]}`, `Everything about your ${(job.event_type ?? 'event').toLowerCase()} in one place`];
  const evDate = eventDate(job.shoots);
  const days = daysUntil(evDate);
  const due = balanceDue(job);
  const proofingCount = proofingGalleries(job).length;

  return (
    <PortalContext.Provider value={{ job, jobOptions, reload: load }}>
      <div style={pageBase}>

        {/* Scrim behind the mobile drawer */}
        {isMobile && navOpen && (
          <div onClick={() => setNavOpen(false)} style={scrim} aria-hidden />
        )}

        {/* ── Sidebar (drawer on mobile) ── */}
        <div style={sidebar(isMobile, navOpen)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px 24px' }}>
            {job.studio?.logo_url
              ? <img src={job.studio.logo_url} alt="" style={{ width: 32, height: 32, borderRadius: 9, objectFit: 'cover' }} />
              : <div style={logoMark}>{(job.studio?.name ?? 'E').charAt(0).toUpperCase()}</div>}
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{job.studio?.name ?? 'Eventor'}</div>
              <div style={{ fontSize: 10.5, color: C.sidebarMuted, letterSpacing: 0.5 }}>CLIENT PORTAL</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 12px' }}>
            {NAV.map((n) => {
              const badgeText = n.to === 'payments' && due > 0 ? 'Due'
                : n.to === 'proofing' && proofingCount > 0 ? 'Action'
                : n.to === 'album' && job.flipbook?.published_at ? 'Ready' : null;
              return (
                <NavLink key={n.to} to={`/portal/${job.id}/${n.to}`} style={({ isActive }) => navItem(isActive)}>
                  <span style={{ width: 20, textAlign: 'center', fontSize: 14 }}>{n.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{n.label}</span>
                  {badgeText && <span style={navBadge}>{badgeText}</span>}
                </NavLink>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', padding: '18px 22px 0' }}>
            {jobOptions.length > 1 && (
              <div style={{ paddingBottom: 16 }}>
                <div style={sidebarLabel}>Your events</div>
                <select
                  value={job.id}
                  onChange={(e) => navigate(`/portal/${e.target.value}/${section}`)}
                  style={eventSelect}
                >
                  {jobOptions.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                </select>
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', paddingTop: 16 }}>
              <div style={sidebarLabel}>Your photographer</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
                <div style={studioAvatar}>{(job.studio?.name ?? 'E').charAt(0).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{job.studio?.name ?? 'Your studio'}</div>
                  <div style={{ fontSize: 11, color: C.sidebarMuted }}>Photography studio</div>
                </div>
              </div>
              <button onClick={() => supabase.auth.signOut()} style={signOutBtn}>Sign out</button>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: isMobile ? 0 : SIDEBAR_WIDTH }}>
          <div style={{ ...topBar, padding: isMobile ? '14px 16px' : '16px 34px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {isMobile && (
                <button onClick={() => setNavOpen(true)} aria-label="Open menu" style={hamburger}>
                  <span style={burgerBar} /><span style={burgerBar} /><span style={burgerBar} />
                </button>
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 800, color: C.green }} className="truncate-1">
                  {title}
                </div>
                {!isMobile && (
                  <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
                    {section === 'event' ? eventSubtitle(job, evDate) : sub}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
              {days !== null && days >= 0 && !isMobile && (
                <div style={countdownChip}>
                  <span style={pulseDot} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: C.limeSoftText }}>
                    {days === 0 ? 'Your event is today' : `${days} day${days === 1 ? '' : 's'} to your ${(job.event_type ?? 'event').toLowerCase()}`}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <div style={clientAvatar}>{job.clientName.charAt(0).toUpperCase()}</div>
                {!isMobile && (
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: C.textStrong }}>{job.clientName}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {user.phone ? prettyPhone(user.phone) : user.email}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* The countdown moves below the bar on phones rather than being dropped. */}
          {isMobile && days !== null && days >= 0 && (
            <div style={{ padding: '12px 16px 0' }}>
              <div style={{ ...countdownChip, display: 'inline-flex' }}>
                <span style={pulseDot} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: C.limeSoftText }}>
                  {days === 0 ? 'Your event is today' : `${days} day${days === 1 ? '' : 's'} to your ${(job.event_type ?? 'event').toLowerCase()}`}
                </span>
              </div>
            </div>
          )}

          <div style={{ padding: isMobile ? '16px 16px 48px' : '28px 34px 60px', maxWidth: 1120 }}>
            <Outlet />
          </div>
        </div>
      </div>
    </PortalContext.Provider>
  );
}

function eventSubtitle(job: PortalJob, evDate: string | null): string {
  const parts = [job.event_type ?? 'Event'];
  if (evDate) parts.push(new Date(evDate).toLocaleDateString('en-LK', { day: 'numeric', month: 'long', year: 'numeric' }));
  const venue = job.shoots.find((s) => s.venue)?.venue;
  if (venue) parts.push(venue);
  return parts.join(' · ');
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const pageBase: React.CSSProperties = {
  fontFamily: FONT, background: C.bg, color: C.text, minHeight: '100vh', display: 'flex',
};

function sidebar(isMobile: boolean, open: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    width: SIDEBAR_WIDTH, flexShrink: 0, background: C.green, color: C.white,
    display: 'flex', flexDirection: 'column', padding: '22px 0',
  };
  if (!isMobile) {
    return {
      ...base,
      position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40,
      height: '100dvh', overflowY: 'auto',
    };
  }
  return {
    ...base,
    position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 60,
    height: '100dvh', overflowY: 'auto',
    transform: open ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.25s ease',
    boxShadow: open ? '0 0 40px rgba(0,0,0,0.3)' : 'none',
  };
}

const SIDEBAR_WIDTH = 246;

const scrim: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(11,42,32,0.5)', zIndex: 55,
};

const logoMark: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 9, background: C.lime, color: C.green,
  fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
};

function navItem(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%', border: 'none', cursor: 'pointer',
    textAlign: 'left', fontSize: 13, fontWeight: 600, padding: '11px 12px', borderRadius: 10,
    fontFamily: 'inherit', textDecoration: 'none', transition: 'background 0.15s ease',
    background: active ? C.white : 'transparent',
    color: active ? C.green : C.sidebarText,
  };
}

const navBadge: React.CSSProperties = {
  background: C.lime, color: C.green, fontSize: 10, fontWeight: 800, borderRadius: 20, padding: '2px 7px',
};

const sidebarLabel: React.CSSProperties = {
  fontSize: 11, color: C.sidebarMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700,
};

const eventSelect: React.CSSProperties = {
  marginTop: 8, width: '100%', background: 'rgba(255,255,255,0.10)', color: C.white,
  border: '1px solid rgba(255,255,255,0.18)', borderRadius: 8, padding: '8px 9px',
  fontSize: 12, fontFamily: 'inherit', fontWeight: 600,
};

const studioAvatar: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', background: C.lime, color: C.green,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0,
};

const signOutBtn: React.CSSProperties = {
  display: 'block', marginTop: 12, width: '100%', background: 'rgba(255,255,255,0.10)', color: C.white,
  border: 'none', fontSize: 12, fontWeight: 600, padding: 9, borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
};

const topBar: React.CSSProperties = {
  background: C.white, borderBottom: `1px solid ${C.border}`, padding: '14px 16px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  position: 'sticky', top: 0, zIndex: 20,
};

const hamburger: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
  background: C.limeSoft, border: `1px solid ${C.limeSoftBorder}`, cursor: 'pointer',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
};

const burgerBar: React.CSSProperties = {
  display: 'block', width: 16, height: 2, borderRadius: 2, background: C.green,
};

const countdownChip: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 7, background: C.limeSoft,
  border: `1px solid ${C.limeSoftBorder}`, borderRadius: 20, padding: '6px 13px',
};

const pulseDot: React.CSSProperties = {
  width: 7, height: 7, borderRadius: '50%', background: C.lime,
  animation: 'pulseDot 2s ease-in-out infinite',
};

const clientAvatar: React.CSSProperties = {
  width: 34, height: 34, borderRadius: '50%', background: C.limeSoft, color: C.green,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0,
};

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', color: C.green, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
};
