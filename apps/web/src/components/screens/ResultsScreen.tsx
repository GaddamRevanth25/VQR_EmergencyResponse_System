import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";
import { safety } from "../../lib/data";

export function ResultsScreen() {
  const [open, setOpen] = useState(0);

  return (
    <PhoneShell title="RESULTS">
      <div className="relative min-h-[720px] bg-white dark:bg-slate-950 text-slate-900 dark:text-white pb-24 transition-colors duration-500">
        {/* Results Header */}
        <div className="bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/app"><ArrowLeft className="text-white" size={18} /></Link>
            <p className="font-mono text-xs text-blue-300">VQR-7C2-941</p>
          </div>
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-extrabold leading-none">Toyota Camry 2024</h2>
            <Badge tone="green">98% match</Badge>
          </div>
          <div className="mt-5 flex gap-2 overflow-hidden">
            <Badge tone="slate">Accord 86%</Badge>
            <Badge tone="slate">Civic 82%</Badge>
            <Badge tone="slate">Corolla 75%</Badge>
          </div>
        </div>

        <div className="p-5">
          <h3 className="mb-3 text-lg font-extrabold">Safety Guidelines</h3>
          <div className="space-y-3">
            {safety.map((s, i) => (
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                key={s.title}
                className="w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900 p-4 text-left transition hover:bg-white dark:hover:bg-slate-800 cursor-pointer text-slate-900 dark:text-white"
              >
                <div className="flex items-center justify-between">
                  <b>{s.title}</b>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${s.color}`}>
                    {s.priority}
                  </span>
                </div>
                {open === i && <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">{s.body}</p>}
              </button>
            ))}
          </div>

          <h3 className="mb-3 mt-6 text-lg font-extrabold">Vehicle Features</h3>
          <div className="flex flex-wrap gap-2">
            {["Hybrid system", "Side curtain airbags", "Reinforced B-pillar", "Smart key", "Li-ion pack"].map((f) => (
              <span key={f} className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-2 text-sm font-semibold text-blue-700 dark:text-blue-400">
                {f}
              </span>
            ))}
          </div>

          {/* Video briefing */}
          <div className="mt-6 overflow-hidden rounded-2xl bg-slate-950 text-white">
            <div className="grid aspect-video place-items-center bg-gradient-to-br from-slate-800 to-blue-950">
              <Play className="size-14 rounded-full bg-white/15 p-3 cursor-pointer" />
            </div>
            <div className="p-4">
              <b>Safety briefing video</b>
              <div className="mt-3 h-1.5 rounded-full bg-white/20">
                <div className="h-full w-1/3 rounded-full bg-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Reset Scan */}
        <div className="absolute inset-x-5 bottom-5">
          <Link
            to="/scan"
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] text-center block"
          >
            Start New Scan
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
