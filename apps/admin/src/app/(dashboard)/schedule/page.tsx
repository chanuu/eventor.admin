import { requireFeature } from '@/lib/staff';
import { EmptyState } from '@/components/states';
import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShootEvent = {
  id: string;
  shoot_type: string | null;
  scheduled_at: string;
  venue: string | null;
  shoot_status: string;
  job_id: string;
  job_title: string;
  job_status: string;
  client_name: string | null;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  lead:       { label: 'Lead',       color: '#6b7280', bg: '#f3f4f6' },
  quoted:     { label: 'Quoted',     color: '#d97706', bg: '#fffbeb' },
  contracted: { label: 'Contracted', color: '#2563eb', bg: '#eff6ff' },
  active:     { label: 'Active',     color: '#16a34a', bg: '#f0fdf4' },
  editing:    { label: 'Editing',    color: '#7c3aed', bg: '#f5f3ff' },
  proofing:   { label: 'Proofing',   color: '#db2777', bg: '#fdf2f8' },
  delivered:  { label: 'Delivered',  color: '#059669', bg: '#ecfdf5' },
  archived:   { label: 'Archived',   color: '#94a3b8', bg: '#f8fafc' },
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseMonth(raw: string | undefined): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split('-').map(Number);
    if (y > 2000 && m >= 1 && m <= 12) return { year: y, month: m };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function prevMonth(year: number, month: number) {
  return month === 1 ? monthParam(year - 1, 12) : monthParam(year, month - 1);
}

function nextMonth(year: number, month: number) {
  return month === 12 ? monthParam(year + 1, 1) : monthParam(year, month + 1);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SchedulePage({ searchParams }: { searchParams: { month?: string } }) {
  await requireFeature('scheduling');
  const { year, month } = parseMonth(searchParams.month);

  const rangeStart = new Date(year, month - 1, 1).toISOString();
  const rangeEnd   = new Date(year, month,     1).toISOString(); // exclusive

  const supabase = createClient();

  const { data: raw } = await supabase
    .from('shoots')
    .select(`
      id, shoot_type, scheduled_at, venue, status,
      jobs(id, title, status, clients(full_name))
    `)
    .gte('scheduled_at', rangeStart)
    .lt('scheduled_at', rangeEnd)
    .not('scheduled_at', 'is', null)
    .order('scheduled_at');

  const events: ShootEvent[] = ((raw ?? []) as any[]).map((s) => ({
    id:           s.id,
    shoot_type:   s.shoot_type,
    scheduled_at: s.scheduled_at,
    venue:        s.venue,
    shoot_status: s.status,
    job_id:       s.jobs?.id ?? '',
    job_title:    s.jobs?.title ?? 'Untitled',
    job_status:   s.jobs?.status ?? 'lead',
    client_name:  (s.jobs?.clients as { full_name: string } | null)?.full_name ?? null,
  }));

  // Group events by day-of-month
  const byDay: Record<number, ShootEvent[]> = {};
  events.forEach((e) => {
    const d = new Date(e.scheduled_at).getDate();
    (byDay[d] ??= []).push(e);
  });

  // Calendar grid math
  const firstWeekDay  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth   = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const totalCells    = 42; // 6 rows × 7 cols

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDate = today.getDate();

  // Build cell array: negative = prev month, 1..daysInMonth = current, >daysInMonth = next month
  const cells: { day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < totalCells; i++) {
    if (i < firstWeekDay) {
      cells.push({ day: prevMonthDays - firstWeekDay + 1 + i, inMonth: false });
    } else if (i < firstWeekDay + daysInMonth) {
      cells.push({ day: i - firstWeekDay + 1, inMonth: true });
    } else {
      cells.push({ day: i - firstWeekDay - daysInMonth + 1, inMonth: false });
    }
  }

  const totalShoots = events.length;

  return (
    <div>
      {/* ── Page heading ── */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="breadcrumb">Main Menu / <span className="text-[#0F3D2E]">Schedule</span></p>
        </div>
        <div className="text-sm text-gray-400 text-right">
          <span className="font-semibold text-gray-700">{totalShoots}</span> shoot{totalShoots !== 1 ? 's' : ''} this month
        </div>
      </div>

      {/* ── Calendar card ── */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between flex-wrap px-6 py-4 border-b border-gray-100">
          <Link             href={`/schedule?month=${prevMonth(year, month)}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </Link>

          <div className="text-center">
            <h2 className="text-base font-bold text-gray-900">{MONTH_NAMES[month - 1]} {year}</h2>
          </div>

          <Link             href={`/schedule?month=${nextMonth(year, month)}`}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </Link>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-3 flex-wrap px-6 py-3 bg-gray-50 border-b border-gray-100">
          {Object.entries(STATUS).map(([key, { label, color }]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="py-2.5 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-100" style={{ minHeight: 540 }}>
          {cells.map(({ day, inMonth }, idx) => {
            const isToday = inMonth && isCurrentMonth && day === todayDate;
            const shoots  = inMonth ? (byDay[day] ?? []) : [];

            return (
              <div
                key={idx}
                className={`min-h-[90px] p-1.5 flex flex-col ${!inMonth ? 'bg-gray-50/60' : ''}`}
              >
                {/* Date number */}
                <div className="flex justify-end mb-1">
                  <span
                    style={isToday ? {
                      background: '#0A2A20', color: '#fff',
                      width: 24, height: 24, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    } : {
                      fontSize: 12,
                      fontWeight: inMonth ? 500 : 400,
                      color: inMonth ? '#374151' : '#d1d5db',
                      width: 24, height: 24,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {day}
                  </span>
                </div>

                {/* Shoot event cards */}
                <div className="flex flex-col gap-0.5">
                  {shoots.map((shoot) => {
                    const cfg = STATUS[shoot.job_status] ?? STATUS.lead;
                    return (
                      <Link                         key={shoot.id}
                        href={`/jobs/${shoot.job_id}/shoots/${shoot.id}`}
                        style={{ borderLeftWidth: 3, borderLeftStyle: 'solid', borderLeftColor: cfg.color, background: cfg.bg }}
                        className="rounded-r-md px-1.5 py-1 block group hover:brightness-95 transition-all"
                      >
                        <p style={{ fontSize: 11, fontWeight: 600, color: '#111827', lineHeight: 1.3 }} className="truncate">
                          {shoot.shoot_type ?? shoot.job_title}
                        </p>
                        {shoot.client_name && (
                          <p style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.2 }} className="truncate">
                            {shoot.client_name}
                          </p>
                        )}
                        <p style={{ fontSize: 10, color: cfg.color, fontWeight: 600, lineHeight: 1.3 }}>
                          {formatTime(shoot.scheduled_at)}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Upcoming list ── */}
      {events.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700">All Shoots This Month</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {events.map((shoot) => {
              const cfg = STATUS[shoot.job_status] ?? STATUS.lead;
              const dt  = new Date(shoot.scheduled_at);
              return (
                <Link                   key={shoot.id}
                  href={`/jobs/${shoot.job_id}/shoots/${shoot.id}`}
                  className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors group"
                >
                  {/* Color strip */}
                  <div style={{ width: 4, height: 40, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />

                  {/* Date block */}
                  <div className="text-center w-10 shrink-0">
                    <p className="text-xs font-bold text-gray-900">{dt.toLocaleDateString('en-LK', { day: '2-digit' })}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{dt.toLocaleDateString('en-LK', { weekday: 'short' })}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {shoot.shoot_type ?? shoot.job_title}
                      {shoot.shoot_type && shoot.shoot_type !== shoot.job_title && (
                        <span className="font-normal text-gray-400 ml-1">· {shoot.job_title}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {shoot.client_name && <span>{shoot.client_name}</span>}
                      {shoot.venue && <span>{shoot.client_name ? ' · ' : ''}{shoot.venue}</span>}
                    </p>
                  </div>

                  {/* Time */}
                  <p className="text-xs font-medium text-gray-500 shrink-0">{formatTime(shoot.scheduled_at)}</p>

                  {/* Status pill */}
                  <span
                    style={{ background: cfg.bg, color: cfg.color }}
                    className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0"
                  >
                    {cfg.label}
                  </span>

                  <svg className="text-gray-300 group-hover:text-gray-400 shrink-0 transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="mt-6 bg-white rounded-2xl shadow-card px-6 py-12 text-center">
          <EmptyState
            compact
            title="Nothing scheduled"
            description={`No shoots booked for ${MONTH_NAMES[month - 1]} ${year}.`}
          />
          <Link href="/jobs" className="inline-block mt-3 text-sm font-medium text-[#0F3D2E] hover:underline">
            Go to Jobs to add a shoot →
          </Link>
        </div>
      )}
    </div>
  );
}
