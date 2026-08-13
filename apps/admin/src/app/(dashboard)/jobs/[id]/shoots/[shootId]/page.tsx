import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  updateShoot,
  assignShootStaff,
  removeShootStaff,
} from '../../../actions';
import ShootStatusForm from './ShootStatusForm';

type Shoot = {
  id: string;
  job_id: string;
  studio_id: string;
  shoot_type: string | null;
  scheduled_at: string | null;
  venue: string | null;
  status: string;
  notes: string | null;
};

type ShootStaffRow = {
  id: string;
  role_in_shoot: string | null;
  staff: { id: string; full_name: string; role: string } | null;
};

type StaffOption = { id: string; full_name: string; role: string };

const SHOOT_STATUSES = ['scheduled', 'shot', 'editing', 'done'];

export default async function ShootDetailPage({ params, searchParams }: {
  params: { id: string; shootId: string };
  searchParams: { saved?: string };
}) {
  const supabase = createClient();

  const { data: shootRaw } = await supabase
    .from('shoots')
    .select('id, job_id, studio_id, shoot_type, scheduled_at, venue, status, notes')
    .eq('id', params.shootId)
    .eq('job_id', params.id)
    .single();

  if (!shootRaw) notFound();
  const shoot = shootRaw as Shoot;

  const [{ data: assignedRaw }, { data: allStaffRaw }, { data: jobRaw }] = await Promise.all([
    supabase
      .from('shoot_staff')
      .select('id, role_in_shoot, staff(id, full_name, role)')
      .eq('shoot_id', shoot.id),
    supabase
      .from('staff')
      .select('id, full_name, role')
      .eq('is_active', true)
      .order('full_name'),
    supabase
      .from('jobs')
      .select('title')
      .eq('id', params.id)
      .single(),
  ]);

  const assigned = (assignedRaw ?? []) as unknown as ShootStaffRow[];
  const allStaff = (allStaffRaw ?? []) as StaffOption[];
  const jobTitle = (jobRaw as { title: string } | null)?.title ?? 'Job';

  const assignedStaffIds = new Set(
    assigned.map((a) => (a.staff as { id: string } | null)?.id).filter(Boolean)
  );
  const unassignedStaff = allStaff.filter((s) => !assignedStaffIds.has(s.id));

  const updateShootAction = updateShoot.bind(null, shoot.id, params.id, shoot.studio_id);
  const assignAction = assignShootStaff.bind(null, shoot.id, params.id, shoot.studio_id);

  // Format scheduled_at for datetime-local input (strip seconds + Z)
  const scheduledValue = shoot.scheduled_at
    ? shoot.scheduled_at.slice(0, 16)
    : '';

  return (
    <div style={{ maxWidth: 600 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <a href={`/jobs/${params.id}`} style={{ fontSize: 13, color: '#6b7280' }}>
          ← {jobTitle}
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>
            {shoot.shoot_type ?? 'Shoot'}
          </h1>
        </div>
        {searchParams.saved && (
          <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>
        )}
      </div>

      {/* Status */}
      <Section title="Status">
        <ShootStatusForm
          shootId={shoot.id}
          jobId={params.id}
          current={shoot.status}
          statuses={SHOOT_STATUSES}
        />
      </Section>

      {/* Shoot details */}
      <Section title="Details">
        <form action={updateShootAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            <Field label="Shoot type">
              <input name="shoot_type" defaultValue={shoot.shoot_type ?? ''} style={inputStyle} placeholder="Wedding, Pre-shoot…" />
            </Field>
            <Field label="Venue">
              <input name="venue" defaultValue={shoot.venue ?? ''} style={inputStyle} placeholder="Location" />
            </Field>
          </div>
          <Field label="Scheduled date & time">
            <input name="scheduled_at" type="datetime-local" defaultValue={scheduledValue} style={inputStyle} />
          </Field>
          <Field label="Notes">
            <textarea
              name="notes"
              rows={2}
              defaultValue={shoot.notes ?? ''}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            />
          </Field>
          <div>
            <button type="submit" style={primaryBtn}>Save details</button>
          </div>
        </form>
      </Section>

      {/* Staff assignment */}
      <Section title="Assigned staff">
        {assigned.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {assigned.map((a) => {
              const member = a.staff as { id: string; full_name: string; role: string } | null;
              const removeAction = removeShootStaff.bind(null, a.id, shoot.id, params.id);
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{member?.full_name ?? '—'}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8, textTransform: 'capitalize' }}>{member?.role}</span>
                    {a.role_in_shoot && (
                      <span style={{ fontSize: 12, color: '#6b7280', marginLeft: 8 }}>· {a.role_in_shoot}</span>
                    )}
                  </div>
                  <form action={removeAction}>
                    <button type="submit" style={{ fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer' }}>
                      Remove
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {unassignedStaff.length > 0 ? (
          <form action={assignAction} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <Field label="Add staff member">
              <select name="staff_id" style={{ ...inputStyle, width: 'auto', minWidth: 180 }}>
                {unassignedStaff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.role})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Role in shoot">
              <input name="role_in_shoot" style={{ ...inputStyle, width: 160 }} placeholder="Photographer, 2nd…" />
            </Field>
            <button type="submit" style={{ ...secondaryBtn, marginBottom: 1 }}>Assign</button>
          </form>
        ) : (
          assigned.length === 0 && (
            <p style={{ fontSize: 13, color: '#9ca3af' }}>No active staff available to assign.</p>
          )
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 16 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
