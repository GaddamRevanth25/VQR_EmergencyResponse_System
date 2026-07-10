import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Search, Clock } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { apiClient } from "../../lib/api";

const VEHICLE_TYPES = [
  { code: "CAR", name: "Car" },
  { code: "BIKE", name: "Bike" },
  { code: "TRAIN", name: "Train" },
  { code: "AIRPLANE", name: "Airplane" },
  { code: "BOAT", name: "Boat" }
];

export function DropdownSearchScreen() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<string>("");
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);

  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");

  const [searchMakeQuery, setSearchMakeQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vqr_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  // Fetch makes when selectedType changes
  useEffect(() => {
    async function fetchMakes() {
      try {
        const list = await apiClient.getMakes(selectedType || undefined);
        setMakes(list);
      } catch (err) {
        console.error("Failed to load makes:", err);
      }
    }
    fetchMakes();
    setSelectedMake("");
    setSelectedModel("");
    setSelectedYear("");
  }, [selectedType]);

  // Fetch models when make changes
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    async function fetchModels() {
      try {
        const list = await apiClient.getModels(selectedMake, selectedType || undefined);
        setModels(list);
      } catch (err) {
        console.error("Failed to load models:", err);
      }
    }
    fetchModels();
    setSelectedModel("");
    setSelectedYear("");
  }, [selectedMake, selectedType]);

  // Fetch years when model changes
  useEffect(() => {
    if (!selectedModel) {
      setYears([]);
      return;
    }
    async function fetchYears() {
      try {
        const list = await apiClient.getYears(selectedMake, selectedModel, selectedType || undefined);
        setYears(list);
      } catch (err) {
        console.error("Failed to load years:", err);
      }
    }
    fetchYears();
    setSelectedYear("");
  }, [selectedModel, selectedMake, selectedType]);

  const filteredMakes = makes.filter((make) =>
    make.toLowerCase().includes(searchMakeQuery.toLowerCase())
  );

  const saveSearchToRecent = (item: { id: string; make: string; model: string; year: number }) => {
    const searchItem = {
      id: item.id,
      title: `${item.make} ${item.model} (${item.year})`,
      type: "browse",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      params: { make: item.make, model: item.model, year: item.year }
    };
    const updated = [searchItem, ...recentSearches.filter(s => s.id !== item.id)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("vqr_recent_searches", JSON.stringify(updated));
  };

  async function handleShowResults() {
    if (!selectedMake || !selectedModel || !selectedYear) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const yearInt = parseInt(selectedYear);
      const vehicle = await apiClient.lookupByDropdown(selectedMake, selectedModel, yearInt);
      saveSearchToRecent(vehicle);
      navigate(`/results/${vehicle.id}`);
    } catch (err) {
      setErrorMsg("No safety instructions found for this vehicle configuration.");
      setLoading(false);
    }
  }

  return (
    <PhoneShell title="BROWSE DIRECTORY">
      <div className="min-h-[720px] bg-slate-50 dark:bg-slate-950 p-5 pb-24 relative text-slate-900 dark:text-white transition-colors duration-500 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/app" className="text-slate-900 dark:text-white">
            <ArrowLeft />
          </Link>
          <h2 className="text-2xl font-extrabold tracking-tight">Select Vehicle</h2>
        </div>

        <div className="mt-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300">
          📍 Choose type, make, model, and year to load safety guides.
        </div>

        <div className="mt-5 space-y-4 flex-1">
          {/* Step 0: Choose Vehicle Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Step 1: Choose Vehicle Type
            </label>
            <div className="relative">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm appearance-none focus:border-blue-500"
              >
                <option value="">-- All Types --</option>
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Step 2: Choose Make */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Step 2: Choose Make
            </label>
            <div className="relative">
              <select
                value={selectedMake}
                onChange={(e) => setSelectedMake(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm appearance-none focus:border-blue-500"
              >
                <option value="">-- Select Make --</option>
                {filteredMakes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>

            <div className="relative mt-2">
              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search size={12} />
              </span>
              <input
                type="text"
                placeholder="Search makes..."
                value={searchMakeQuery}
                onChange={(e) => setSearchMakeQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-xl pl-8 pr-4 py-1.5 text-xs outline-none text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {/* Step 3: Choose Model */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Step 3: Choose Model
            </label>
            <div className="relative">
              <select
                disabled={!selectedMake}
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500"
              >
                <option value="">-- Select Model --</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          {/* Step 4: Choose Year */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Step 4: Choose Year
            </label>
            <div className="relative">
              <select
                disabled={!selectedModel}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm appearance-none disabled:opacity-50 disabled:cursor-not-allowed focus:border-blue-500"
              >
                <option value="">-- Select Year --</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                <ChevronRight size={16} className="rotate-90" />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs font-semibold text-red-500 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Recent searches history */}
          {recentSearches.length > 0 && (
            <div className="mt-4 border-t border-slate-200 dark:border-white/10 pt-4">
              <span className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">
                Recent Searches
              </span>
              <div className="space-y-2">
                {recentSearches.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigate(`/results/${s.id}`)}
                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    <span className="text-xs font-semibold flex items-center gap-2">
                      <Clock size={12} className="text-slate-400" />
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-400">{s.timestamp}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions Button */}
        <div className="absolute inset-x-5 bottom-5">
          <button
            onClick={handleShowResults}
            disabled={!selectedYear || loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition text-center flex items-center justify-center gap-2"
          >
            {loading ? "Loading Details..." : "Show Results"}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
