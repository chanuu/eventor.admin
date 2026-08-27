/**
 * Shown the instant a navigation starts, so the app responds to a click rather
 * than sitting on the old page until the server render arrives.
 *
 * A skeleton in the shape of a typical page reads as "loading this" rather than
 * a spinner that could mean anything.
 */
export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Heading */}
      <div className="h-5 w-40 rounded bg-line" />
      <div className="h-3 w-56 rounded bg-line-soft mt-2.5" />

      {/* Panel */}
      <div className="bg-white rounded-2xl border border-line shadow-card p-4 sm:p-6 mt-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <div className="h-10 w-full md:w-72 rounded-xl bg-line-soft" />
          <div className="hidden md:block md:flex-1" />
          <div className="h-10 w-full md:w-40 rounded-lg bg-line-soft" />
        </div>

        <div className="rounded-2xl border border-line overflow-hidden">
          <div className="h-11 bg-panel border-b border-line" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-line-soft last:border-0">
              <div className="flex-1 min-w-0">
                <div className="h-3.5 w-1/3 rounded bg-line" />
                <div className="h-2.5 w-1/2 rounded bg-line-soft mt-2" />
              </div>
              <div className="h-6 w-20 rounded-full bg-line-soft shrink-0" />
              <div className="h-3.5 w-24 rounded bg-line-soft shrink-0 hidden sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
