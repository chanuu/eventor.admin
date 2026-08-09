type Props = { staffName: string; role: string; studioName: string };

export default function AppHeader({ staffName, role, studioName }: Props) {
  return (
    <header className="h-16 bg-white border-b border-gray-100 px-8 flex items-center gap-4 shrink-0 sticky top-0 z-10">
      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 h-10 w-72">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder="Search here..."
          className="bg-transparent flex-1 text-sm text-gray-600 placeholder-gray-400 outline-none"
        />
      </div>

      <div className="flex-1" />

      {/* Chat icon */}
      <button className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Bell icon */}
      <button className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </button>

      {/* User */}
      <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
        <div className="w-9 h-9 rounded-full bg-[#2D6A4F] flex items-center justify-center text-white text-sm font-bold shrink-0">
          {staffName.charAt(0).toUpperCase()}
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{staffName}</p>
          <p className="text-[11px] text-gray-400 capitalize">{role}</p>
        </div>
      </div>
    </header>
  );
}
