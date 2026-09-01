import Link from 'next/link';
import { requirePlatformAdmin } from '@/lib/platform';
import { createClient } from '@/lib/supabase/server';
import { toggleLeadSource, deleteLeadSource } from './actions';
import NewLeadSourceForm from './NewLeadSourceForm';

type SourceRow = { id: string; name: string; is_active: boolean; sort_order: number };

export default async function PlatformLeadSourcesPage() {
  await requirePlatformAdmin();
  const supabase = createClient();

  const { data: sourcesRaw } = await supabase
    .from('lead_sources')
    .select('id, name, is_active, sort_order')
    .order('sort_order');

  const sources = (sourcesRaw ?? []) as SourceRow[];

  return (
    <div style={{ maxWidth: 820 }}>
      <Link href="/platform" className="text-[13px] text-ink-muted">← Platform</Link>
      <h1 className="page-title mt-2">Lead sources</h1>
      <p className="breadcrumb mb-6">
        The shared list every studio picks from when recording where an enquiry came from.
      </p>

      <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
        <div className="px-5 py-3.5 bg-panel border-b border-line flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            {sources.filter((s) => s.is_active).length} active of {sources.length}
          </span>
          <span className="text-[11.5px] text-ink-muted">
            Turning one off hides it from new jobs; existing jobs keep their value.
          </span>
        </div>

        <div className="flex flex-col">
          {sources.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5 border-b border-line-soft last:border-0 flex-wrap">
              <span className={`text-[13.5px] font-semibold flex-1 min-w-[140px] ${s.is_active ? 'text-ink-strong' : 'text-ink-muted line-through'}`}>
                {s.name}
              </span>

              <form action={toggleLeadSource.bind(null, s.id, !s.is_active)}>
                <button type="submit" className="btn-secondary text-[12px] h-8 px-3">
                  {s.is_active ? 'Turn off' : 'Turn on'}
                </button>
              </form>

              <form action={deleteLeadSource.bind(null, s.id)}>
                <button type="submit" className="btn-danger text-[12px] h-8 px-3">Remove</button>
              </form>
            </div>
          ))}

          {sources.length === 0 && (
            <p className="px-5 py-10 text-center text-[13px] text-ink-muted">
              No sources yet. Add the first one below.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-line shadow-card p-6 mt-4">
        <h2 className="text-sm font-extrabold text-primary">Add a source</h2>
        <p className="text-[12.5px] text-ink-muted mt-1 mb-4">
          Available to every studio immediately.
        </p>
        <NewLeadSourceForm />
      </div>

      <p className="text-[12px] text-ink-muted mt-4 leading-relaxed">
        Jobs store the source as text, so removing an option here never rewrites past enquiries —
        studios keep reporting on it, they just cannot pick it for new work.
      </p>
    </div>
  );
}
