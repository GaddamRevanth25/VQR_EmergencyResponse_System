import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, AlertCircle, RefreshCw, Clock } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { apiClient } from "../../lib/api";

const COUNTRIES = [
  { code: "IN", name: "India (e.g. MH-02-CL-0555)" },
  { code: "UK", name: "United Kingdom (e.g. TE57VRN)" },
  { code: "US", name: "United States (e.g. 7XER187)" },
  { code: "VIN", name: "17-Digit Vehicle Identifier (VIN)" },
];

const US_STATES = ["CA", "TX", "NY", "FL", "IL", "PA", "OH", "MI"];

export function ManualScreen() {
  const navigate = useNavigate();
  const [inputType, setInputType] = useState<string>("IN");
  const [inputValue, setInputValue] = useState<string>("");
  const [usState, setUsState] = useState<string>("CA");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [recentSearches, setRecentSearches] = useState<any[]>([]);

  // Load recent searches on mount
  useEffect(() => {
    const saved = localStorage.getItem("vqr_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  // Auto-formatting depending on country selection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase();

    if (inputType === "IN") {
      val = val.replace(/[^A-Z0-9-]/g, "");
    } else if (inputType === "UK") {
      val = val.replace(/[^A-Z0-9]/g, "");
    } else if (inputType === "US") {
      val = val.replace(/[^A-Z0-9]/g, "");
    } else if (inputType === "VIN") {
      val = val.replace(/[^A-HJ-NPR-Z0-9]/g, "");
      if (val.length > 17) val = val.slice(0, 17);
    }

    setInputValue(val);
  };

  // Reset input when type changes
  useEffect(() => {
    setInputValue("");
    setErrorMsg("");
  }, [inputType]);

  const saveSearchToRecent = (item: { vehicleId: string; make: string; model: string; year: number; registrationNumber: string }) => {
    const searchItem = {
      id: item.vehicleId,
      title: `${item.make} ${item.model} (${item.year})`,
      type: "manual",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      params: { reg: item.registrationNumber }
    };
    const updated = [searchItem, ...recentSearches.filter(s => s.id !== item.vehicleId)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem("vqr_recent_searches", JSON.stringify(updated));
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    setLoading(true);
    setErrorMsg("");

    try {
      if (inputType === "VIN" && inputValue.length !== 17) {
        throw new Error("VIN must be exactly 17 characters long.");
      }

      const response = await apiClient.lookupVehicle(inputValue, inputType);
      saveSearchToRecent(response);
      navigate(`/results/${response.vehicleId}`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err.message ||
        "No matching vehicle found. Please verify the entry and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneShell title="VIN & REGISTRATION ENTRY">
      <div className="min-h-[720px] bg-slate-50 dark:bg-slate-950 p-5 pb-24 relative text-slate-900 dark:text-white transition-colors duration-500 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center gap-3">
            <Link to="/app" className="text-slate-900 dark:text-white">
              <ArrowLeft />
            </Link>
            <h2 className="text-2xl font-extrabold tracking-tight">Manual Search</h2>
          </div>

          {/* Form Container */}
          <form onSubmit={handleLookup} className="mt-6 space-y-4">
            {/* Selector for input type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Identifier Type
              </label>
              <select
                value={inputType}
                onChange={(e) => setInputType(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm focus:border-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Input field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {inputType === "VIN" ? "Enter 17-Char VIN" : "Enter License Plate"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder={
                    inputType === "VIN"
                      ? "e.g. WBAFR7C57CC811956"
                      : inputType === "IN"
                      ? "MH02CL0555"
                      : inputType === "UK"
                      ? "TE57VRN"
                      : "7XER187"
                  }
                  value={inputValue}
                  onChange={handleInputChange}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl pl-4 pr-12 py-3.5 font-semibold text-md outline-none text-slate-900 dark:text-white shadow-sm focus:border-blue-500 placeholder:text-slate-400/80"
                />
                <span className="absolute inset-y-0 right-4 flex items-center text-slate-400">
                  <Search size={18} />
                </span>
              </div>
            </div>

            {/* US State Selector if US is chosen */}
            {inputType === "US" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  US State
                </label>
                <select
                  value={usState}
                  onChange={(e) => setUsState(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3.5 font-semibold text-sm outline-none text-slate-900 dark:text-white shadow-sm focus:border-blue-500"
                >
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {errorMsg && (
              <div className="rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4 text-xs text-red-700 dark:text-red-400 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <b className="font-bold">Lookup Failed</b>
                  <p className="mt-1 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Prompt banner for pre-trip readiness */}
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-white/5">
              🔑 <b>Tip:</b> Try one of these mock codes:
              <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-[10px]">
                <li>India Plate: MH02CL0555 (BMW 740Li)</li>
                <li>UK Plate: TE57VRN (Toyota Camry)</li>
                <li>VIN Number: WBAFR7C57CC811956 (Toyota Camry)</li>
              </ul>
            </div>
          </form>

          {/* Recent searches history */}
          {recentSearches.length > 0 && (
            <div className="mt-6 border-t border-slate-200 dark:border-white/10 pt-4">
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

        {/* Lookup Button */}
        <div className="mt-8">
          <button
            type="submit"
            onClick={handleLookup}
            disabled={!inputValue.trim() || loading}
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={16} /> Checking Database...
              </>
            ) : (
              "Lookup Vehicle"
            )}
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
