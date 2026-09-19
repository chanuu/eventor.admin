import { redirect } from 'next/navigation';

/** The job checklist now lives in Settings as a tab. */
export default function TaskStagesRedirect() {
  redirect('/settings?tab=checklist');
}
