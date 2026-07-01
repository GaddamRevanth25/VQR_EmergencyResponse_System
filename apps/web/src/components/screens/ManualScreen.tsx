import { Link } from "react-router-dom";
import { ArrowLeft, Car } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";
import { vehicles } from "../../lib/data";

export function ManualScreen() {
  return (
    <PhoneShell title="MANUAL ENTRY">
      <div className="min-h-[720px] bg-slate-50 dark:bg-slate-950 p-5 pb-24 relative text-slate-900 dark:text-white transition-colors duration-500">
        <div className="flex items-center gap-3">
          <Link to="/app"><ArrowLeft className="text-slate-900 dark:text-white" /></Link>
          <h2 className="text-2xl font-extrabold">Manual Entry</h2>
        </div>

        {/* Inputs */}
        <div className="mt-6 space-y-3">
          {["Make", "Model", "Year"].map((l, i) => (
            <label key={l} className="block rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-4 py-2 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{l}</span>
              <input
                value={i === 0 ? "Toyota" : i === 1 ? "Camry" : "2024"}
                readOnly
                className="mt-1 w-full bg-transparent font-semibold outline-none text-slate-900 dark:text-white"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-300">
          Predictive matches updated from local rescue database.
        </div>

        {/* Matching Vehicles */}
        <div className="mt-5 space-y-3">
          {vehicles.map((v) => (
            <Link
              to="/results"
              key={v.vin}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 p-3 shadow-sm text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition block"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`grid size-16 place-items-center rounded-xl ${v.color} text-white`}>
                  <Car />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-left">
                    {v.name} {v.year}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400 text-left">{v.vin}</p>
                </div>
                <Badge tone="green">{v.match}</Badge>
              </div>
            </Link>
          ))}
        </div>

        <div className="absolute inset-x-6 bottom-4 rounded-t-[1.5rem] bg-slate-900 dark:bg-slate-800 p-4 text-center font-mono text-xs text-white/70">
          keyboard active preview · content pushed above safe area
        </div>
      </div>
    </PhoneShell>
  );
}
