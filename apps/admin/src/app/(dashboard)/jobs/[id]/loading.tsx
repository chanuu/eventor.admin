/** Job detail is the heaviest page — show its shape immediately. */
export default function JobLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-16 rounded bg-line-soft" />
      <div className="h-6 w-64 rounded bg-line mt-2" />
      <div className="h-3 w-48 rounded bg-line-soft mt-2" />

      <div className="bg-white rounded-2xl border border-line shadow-card mt-5 overflow-hidden">
        <div className="h-16 bg-panel border-b border-line" />
        <div className="flex flex-wrap gap-1.5 p-4 border-b border-line">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-24 rounded-[10px] bg-line-soft" />
          ))}
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="h-4 w-32 rounded bg-line" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-panel border border-line-soft" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
