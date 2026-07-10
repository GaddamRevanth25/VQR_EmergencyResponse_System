import { Link } from "react-router-dom";
import { Siren, Search, Camera, ChevronRight, Sparkles, BookOpen } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";

export function HomeScreen({
  emergency,
  setEmergency,
}: {
  emergency: boolean;
  setEmergency: (v: boolean) => void;
}) {
  return (
    <PhoneShell title="VQR PASSENGER PORTAL">
      <div className="relative min-h-[720px] bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 text-slate-900 dark:text-white transition-colors duration-500 flex flex-col justify-between">
        <div>
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25">
                <Siren size={22} className="animate-pulse" />
              </div>
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.22em] text-blue-700 dark:text-blue-400">VQR SAFETY</p>
                <h1 className="text-xl font-extrabold leading-none">Passenger Portal</h1>
              </div>
            </div>
            {/* Safe emergency button indicator */}
            <button
              onClick={() => setEmergency(!emergency)}
              className={`relative h-8 w-14 rounded-full p-1 transition ${emergency ? "bg-red-600" : "bg-slate-300 dark:bg-slate-700"}`}
            >
              <span className={`block size-6 rounded-full bg-white transition ${emergency ? "translate-x-6" : ""}`} />
            </button>
          </div>

          {emergency && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-red-700 dark:text-red-400 text-xs">
              <span className="size-2 animate-ping rounded-full bg-red-600" />
              <b>Emergency Mode Armed</b> · Ready for quick procedures lookup.
            </div>
          )}

          {/* Heading */}
          <div className="mt-10 text-center">
            <Badge tone="green">Ready for travel</Badge>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold leading-[1.1] tracking-tight">
              Know Your Vehicle. Travel Safer.
            </h2>
            <p className="mx-auto mt-4 max-w-sm text-sm text-slate-600 dark:text-slate-400">
              Get familiar with emergency exits, glass-breaking hammers, and first aid kits before you travel.
            </p>
          </div>

          {/* Pre-Trip Readiness Callout Banner */}
          <div className="mt-6 rounded-2xl border border-teal-200/55 dark:border-teal-900/40 bg-teal-500/10 p-4 text-left flex items-start gap-3.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-teal-800 dark:text-teal-300">Pre-Trip Check</h4>
              <p className="text-xs text-teal-700/90 dark:text-teal-400/90 mt-1 leading-relaxed">
                Renting a car or boarding a bus? Scan or enter details now to know where the safety features are situated.
              </p>
            </div>
          </div>

          {/* Actions Grid */}
          <div className="mt-8 space-y-4">
            {[
              {
                icon: Search,
                title: "Enter VIN / Reg Number",
                sub: "Manual entry for instant matches",
                color: "bg-blue-600",
                path: "/manual-entry",
              },
              {
                icon: Camera,
                title: "Scan License Plate",
                sub: "Auto-scan via camera or upload photo",
                color: "bg-cyan-600",
                path: "/scan",
              },
              {
                icon: BookOpen,
                title: "Select Make → Model → Year",
                sub: "Browse the vehicle directory",
                color: "bg-slate-900 dark:bg-slate-800",
                path: "/dropdown-search",
              },
            ].map((a) => (
              <Link
                key={a.title}
                to={a.path}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4.5 text-left shadow-sm transition active:scale-[0.98] hover:border-blue-500/50"
              >
                <div className={`grid size-12 place-items-center rounded-xl ${a.color} text-white`}>
                  <a.icon size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="text-md font-bold tracking-tight">{a.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.sub}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
