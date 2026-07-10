import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Trash2, ChevronRight, Search, Calendar } from "lucide-react";
import { PhoneShell } from "../PhoneShell";

const MOCK_DEFAULT_HISTORY = [
  {
    id: "toyota-camry-2024",
    title: "Toyota Camry (2024)",
    type: "browse",
    timestamp: "02:14 PM",
    date: "Jul 10, 2026",
    params: { make: "Toyota", model: "Camry", year: 2024 }
  },
  {
    id: "bmw-740li-2012",
    title: "BMW 740Li (2012)",
    type: "manual",
    timestamp: "10:30 AM",
    date: "Jul 08, 2026",
    params: { reg: "MH02CL0555" }
  },
  {
    id: "honda-cbr-2023",
    title: "Honda CBR (2023)",
    type: "scan",
    timestamp: "06:45 PM",
    date: "Jul 09, 2026",
    params: { reg: "HONDA-CBR" }
  }
];

export function HistoryScreen() {
  const navigate = useNavigate();
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = () => {
    const saved = localStorage.getItem("vqr_recent_searches");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setRecentSearches(parsed);
          return;
        }
      } catch (e) { }
    }
    
    // Pre-populate with default travel history so search/date filter is immediately testable
    localStorage.setItem("vqr_recent_searches", JSON.stringify(MOCK_DEFAULT_HISTORY));
    setRecentSearches(MOCK_DEFAULT_HISTORY);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const clearHistory = () => {
    localStorage.setItem("vqr_recent_searches", JSON.stringify([]));
    setRecentSearches([]);
  };

  // Filter history items by vehicle title or search date/time
  const filteredHistory = recentSearches.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const titleMatch = item.title?.toLowerCase().includes(query);
    const dateMatch = item.date?.toLowerCase().includes(query);
    const timeMatch = item.timestamp?.toLowerCase().includes(query);
    const typeMatch = item.type?.toLowerCase().includes(query);
    
    return titleMatch || dateMatch || timeMatch || typeMatch;
  });

  return (
    <PhoneShell title="SEARCH CACHE & PREFERENCES">
      <div className="min-h-[720px] bg-slate-50 dark:bg-slate-950 p-5 pb-24 relative text-slate-900 dark:text-white transition-colors duration-500 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => navigate(-1)} 
                className="text-slate-900 dark:text-white hover:opacity-80 transition cursor-pointer"
              >
                <ArrowLeft />
              </button>
              <h2 className="text-2xl font-extrabold tracking-tight">Search History</h2>
            </div>
            {recentSearches.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-red-500 hover:text-red-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 size={14} /> Clear Cache
              </button>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300">
            💾 Search your previously identified vehicles by vehicle name or travel date.
          </div>

          {/* Search bar is always visible or displayed if there is history */}
          {recentSearches.length > 0 && (
            <div className="relative mt-4">
              <span className="absolute inset-y-0 left-4 flex items-center text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search by vehicle name, date, time..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none text-slate-900 dark:text-white shadow-sm focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>
          )}

          {/* List of cache items */}
          <div className="mt-6 space-y-3">
            {recentSearches.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="grid size-12 place-items-center rounded-full bg-slate-100 dark:bg-slate-900 mx-auto text-slate-400">
                  <Clock size={24} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No cached searches</p>
                  <p className="text-xs text-slate-400 max-w-[200px] mx-auto">Vehicles you search for or scan will appear here for quick offline access.</p>
                </div>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching results found for "{searchQuery}".
              </div>
            ) : (
              filteredHistory.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/results/${s.id}`)}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl text-left hover:border-blue-500/50 transition cursor-pointer shadow-sm group"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Clock size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                        {s.title}
                      </h4>
                      <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5 tracking-wider flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-blue-500 dark:text-cyan-400">{s.type} method</span>
                        {s.params?.reg && (
                          <>
                            <span>•</span>
                            <span className="font-mono">Reg: {s.params.reg}</span>
                          </>
                        )}
                        {s.date && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar size={10} />
                              {s.date}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold">{s.timestamp}</span>
                    <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Start new search action */}
        {recentSearches.length === 0 && (
          <div className="mt-8">
            <button
              onClick={() => navigate("/app")}
              className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] transition text-center"
            >
              Start Your First Search
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
