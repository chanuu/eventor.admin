'use client';

import { EmptyState } from '@/components/states';

import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

export type MonthlyPoint    = { month: string; revenue: number };
export type EventTypePoint  = { type: string; revenue: number; count: number };
export type StatusPoint     = { status: string; count: number };

const EVENT_COLORS = ['#0F3D2E', '#8BC53F', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#EF4444'];

const STATUS_COLORS: Record<string, string> = {
  lead:       '#9ca3af',
  quoted:     '#f59e0b',
  contracted: '#3b82f6',
  active:     '#0F3D2E',
  editing:    '#8b5cf6',
  proofing:   '#ec4899',
  delivered:  '#10b981',
  archived:   '#d1d5db',
};

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-card px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? p.fill }}>
          Rs.{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
}

export function MonthlyRevenueChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0F3D2E" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
          width={42}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#0F3D2E"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={{ r: 3, fill: '#0F3D2E', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#0F3D2E' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EventTypeChart({ data }: { data: EventTypePoint[] }) {
  if (data.length === 0) {
    return <EmptyState compact title="No job data yet" description="Revenue by event type appears once you have jobs." />;
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false} tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="type"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false} tickLine={false}
          width={90}
        />
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((_, i) => (
            <Cell key={i} fill={EVENT_COLORS[i % EVENT_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function JobStatusPipeline({ data }: { data: StatusPoint[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  if (data.length === 0) {
    return <EmptyState compact title="No jobs yet" description="Your pipeline fills in as jobs move through their stages." />;
  }
  return (
    <div className="flex flex-col gap-3">
      {data.map(({ status, count }) => (
        <div key={status}>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs capitalize text-gray-500">{status}</span>
            <span className="text-xs font-semibold text-gray-800">{count}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(count / max) * 100}%`,
                backgroundColor: STATUS_COLORS[status] ?? '#9ca3af',
                transition: 'width 0.6s ease',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
