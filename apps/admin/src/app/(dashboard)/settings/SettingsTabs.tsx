import Link from 'next/link';

export type SettingsTabId = 'studio' | 'checklist' | 'billing' | 'roles';

export const TAB_LABEL: Record<SettingsTabId, string> = {
  studio: 'Studio',
  checklist: 'Job checklist',
  billing: 'Billing & plan',
  roles: 'Roles & permissions',
};

/**
 * Tab nav for Settings.
 *
 * Plain links rather than client state, so each tab is a real URL that can be
 * bookmarked and linked to — requireFeature() already redirects to
 * /settings?tab=billing&locked=…, which only works if that is a genuine address.
 */
export default function SettingsTabs({
  active,
  available,
}: {
  active: SettingsTabId;
  available: SettingsTabId[];
}) {
  if (available.length < 2) return null;

  return (
    <div className="flex gap-1.5 flex-wrap mb-6 border-b border-line pb-3">
      {available.map((id) => {
        const isActive = id === active;
        return (
          <Link
            key={id}
            href={id === 'studio' ? '/settings' : `/settings?tab=${id}`}
            className={`rounded-lg px-3.5 h-9 inline-flex items-center text-[13px] font-semibold
              transition-colors
              ${isActive
                ? 'bg-primary text-white'
                : 'text-ink-mid hover:text-primary hover:bg-panel'}`}
          >
            {TAB_LABEL[id]}
          </Link>
        );
      })}
    </div>
  );
}
