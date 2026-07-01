import { UserRound, MapPin, SlidersHorizontal } from "lucide-react";
import { Badge } from "../Badge";
import { savedTravels } from "../../lib/data";

export function SavedProfilePanel() {
  return (
    <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-white">
            <UserRound />
          </div>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-blue-700">
              Signed-in workspace
            </p>
            <h2 className="text-2xl font-extrabold">Saved travels & preferences</h2>
          </div>
        </div>
        <Badge tone="green">Auto-sync on</Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_.95fr]">
        <div className="rounded-3xl border bg-slate-50 p-4">
          <h3 className="font-extrabold">Previous travels</h3>
          <div className="mt-3 space-y-3">
            {savedTravels.map((t) => (
              <div key={t.route} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white">
                  <MapPin size={18} />
                </div>
                <div className="flex-1">
                  <b>{t.route}</b>
                  <p className="text-sm text-slate-500">
                    {t.date} · {t.vehicle}
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-blue-700">{t.scans}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border bg-slate-950 p-4 text-white">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-blue-300" />
            <h3 className="font-extrabold">Preferences saved</h3>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            {["Default to Emergency Mode", "Night-use dark interface", "Metric units + GPS coordinates", "Notify emergency contacts"].map(
              (pref, i) => (
                <div key={pref} className="flex items-center justify-between rounded-2xl bg-white/10 p-3">
                  <span>{pref}</span>
                  <span className={`h-6 w-10 rounded-full p-1 ${i < 3 ? "bg-green-500" : "bg-slate-600"}`}>
                    <span className={`block size-4 rounded-full bg-white ${i < 3 ? "translate-x-4" : ""}`} />
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
