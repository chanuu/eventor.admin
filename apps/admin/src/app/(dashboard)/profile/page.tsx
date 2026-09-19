import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import AvatarUpload from '../staff/AvatarUpload';
import ChangePassword from '../settings/ChangePassword';
import ProfileForm from './ProfileForm';

/**
 * Your own account.
 *
 * Deliberately behind no capability at all — every staff member has a profile,
 * including an editor who can reach almost nothing else. Studio-wide settings
 * live in /settings and stay gated on settings.manage.
 */
export default async function ProfilePage() {
  const me = await getStaff();
  if (!me) redirect('/login');

  const supabase = createClient();

  const [{ data: staffRaw }, { data: auth }] = await Promise.all([
    supabase.from('staff').select('id, full_name, avatar_url, created_at').eq('id', me.id).single(),
    supabase.auth.getUser(),
  ]);

  const profile = staffRaw as {
    id: string;
    full_name: string;
    avatar_url: string | null;
    created_at: string;
  } | null;

  if (!profile) redirect('/login');

  return (
    <div>
      <h1 className="page-title">My profile</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-[#0F3D2E]">Profile</span>
      </p>

      <div className="max-w-2xl flex flex-col gap-4">
        {/* Picture */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Profile picture
          </h2>
          <div className="flex items-center gap-5 flex-wrap">
            <AvatarUpload
              staffId={profile.id}
              name={profile.full_name}
              url={profile.avatar_url}
              size={72}
            />
            <div className="min-w-0">
              <p className="text-[13px] text-ink-body">
                Click the picture to choose a new one.
              </p>
              <p className="text-[11.5px] text-ink-muted mt-1">
                Resized in your browser before upload — any size works.
              </p>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="bg-white rounded-2xl shadow-card p-6">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
            Your details
          </h2>

          <ProfileForm fullName={profile.full_name} />

          <div className="border-t border-line-soft mt-5 pt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                Email
              </p>
              <p className="text-[13px] text-ink-body break-all">
                {auth.user?.email ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                Role
              </p>
              <p className="text-[13px] text-ink-body">{me.roleName}</p>
            </div>
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                Studio
              </p>
              <p className="text-[13px] text-ink-body">{me.studioName}</p>
            </div>
          </div>

          <p className="text-[11.5px] text-ink-muted mt-4">
            Your email and role are set by whoever manages staff — ask them if either needs
            changing.
          </p>
        </div>

        {/* Password */}
        <ChangePassword />
      </div>
    </div>
  );
}
