type Props = { staffName: string; role: string; studioName: string };

export default function AppHeader({ studioName }: Props) {
  return (
    <header className="h-16 bg-white border-b border-line pl-16 pr-4 lg:px-8 flex items-center gap-3 sm:gap-4 shrink-0 sticky top-0 z-10">
      {/* Search — hidden on phones, where the hamburger takes the left slot */}
      <div className="hidden md:flex items-center gap-2 bg-panel border border-line rounded-xl px-3 h-10 w-56 lg:w-72">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b968f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search here..."
          className="bg-transparent flex-1 text-sm text-ink-mid placeholder-ink-muted outline-none"
        />
      </div>

      <div className="flex-1" />

      {/* Studio badge */}
      <div className="flex items-center gap-2 bg-lime-soft border border-lime-border rounded-full px-3 sm:px-3.5 py-1.5 min-w-0">
        <span className="w-[7px] h-[7px] rounded-full bg-lime animate-pulseDot shrink-0" />
        <span className="text-[11.5px] font-bold text-lime-text truncate max-w-[40vw] sm:max-w-none">
          {studioName || 'Your studio'}
        </span>
      </div>

      {/* Notifications */}
      <button className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-muted hover:bg-panel hover:text-ink-mid transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>
    </header>
  );
}
