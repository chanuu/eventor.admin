/** Dashboard pulls seven queries and renders charts — it benefits most. */
export default function DashboardHomeLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-5 w-36 rounded bg-line" />
      <div className="h-3 w-24 rounded bg-line-soft mt-2.5 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-line-soft shrink-0" />
            <div className="flex-1">
              <div className="h-5 w-16 rounded bg-line" />
              <div className="h-2.5 w-20 rounded bg-line-soft mt-2" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-5 lg:col-span-2 h-64" />
        <div className="bg-white rounded-2xl shadow-card p-5 h-64" />
      </div>
    </div>
  );
}
