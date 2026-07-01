import { Link } from "react-router-dom";
import { Siren, Search, Camera, ChevronRight, Home, Clock3, ShieldAlert } from "lucide-react";
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
    <PhoneShell title="VQR HOME">
      <div className="relative min-h-[720px] bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 text-slate-900 dark:text-white transition-colors duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white">
              <Siren size={22} />
            </div>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.22em] text-blue-700 dark:text-blue-400">VQR</p>
              <h1 className="text-xl font-extrabold leading-none">Vehicle Quick Response</h1>
            </div>
          </div>
          <button
            onClick={() => setEmergency(!emergency)}
            className={`relative h-8 w-14 rounded-full p-1 transition ${emergency ? "bg-red-600" : "bg-slate-300 dark:bg-slate-700"}`}
          >
            <span className={`block size-6 rounded-full bg-white transition ${emergency ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {emergency && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3 text-red-700 dark:text-red-400">
            <span className="size-2 animate-ping rounded-full bg-red-600" />
            <b>Emergency Mode armed</b>
          </div>
        )}

        <div className="mt-10 text-center">
          <Badge tone="green">Responder ready</Badge>
          <h2 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-0.02em]">
            Identify a vehicle in seconds.
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-slate-600 dark:text-slate-400">
            Fast safety guidance, match confidence, and future crash dispatch flows in one uncluttered field interface.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            { icon: Search, title: "Enter Vehicle Details", sub: "Make, model, year", color: "bg-blue-600", path: "/manual-entry" },
            { icon: Camera, title: "Camera Scan", sub: "Identify via photo", color: "bg-slate-950 dark:bg-slate-800", path: "/scan" },
          ].map((a) => (
            <Link
              key={a.title}
              to={a.path}
              className="group flex min-h-[7.5rem] items-center gap-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-5 text-left shadow-sm transition active:scale-[0.98] hover:border-blue-500/50"
            >
              <div className={`grid size-14 place-items-center rounded-2xl ${a.color} text-white`}>
                <a.icon />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="text-slate-500 dark:text-slate-400">{a.sub}</p>
              </div>
              <ChevronRight className="text-slate-400 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="absolute inset-x-6 bottom-4 flex justify-around rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 py-3 text-slate-500 dark:text-slate-400 shadow-lg">
          <Link to="/app"><Home className="text-blue-600 dark:text-blue-400" /></Link>
          <Link to="/manual-entry"><Clock3 /></Link>
          <Link to="/results"><ShieldAlert /></Link>
        </div>
      </div>
    </PhoneShell>
  );
}
