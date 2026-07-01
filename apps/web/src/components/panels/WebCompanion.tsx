import { Upload, ScanLine, MapPin, Check, Circle } from "lucide-react";

export function WebCompanion() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_.9fr]">
      <div className="rounded-[2rem] border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Upload className="text-blue-600" />
          <h2 className="text-2xl font-extrabold">Web upload fallback</h2>
        </div>
        <div className="mt-5 grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-blue-300 bg-blue-50 text-center">
          <div>
            <ScanLine className="mx-auto size-12 text-blue-600" />
            <p className="mt-3 font-bold">Drop vehicle photo here</p>
            <p className="text-slate-600">or click to browse when camera permission is unavailable</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border bg-slate-950 p-6 text-white">
        <div className="flex items-center gap-3">
          <MapPin className="text-green-400" />
          <h2 className="text-2xl font-extrabold">Dispatch status</h2>
        </div>
        <div className="mt-5 rounded-3xl bg-slate-800 p-5">
          <div className="grid h-44 place-items-center rounded-2xl bg-slate-700/60 font-mono text-sm text-slate-300">
            MAP PLACEHOLDER · 37.7749, -122.4194
          </div>
          {["Alert Sent", "Police Notified", "Ambulance Dispatched", "Contact Alerted"].map((s, i) => (
            <div key={s} className="mt-4 flex items-center gap-3">
              <span className={`grid size-7 place-items-center rounded-full ${i < 3 ? "bg-green-500" : "bg-slate-600"}`}>
                {i < 3 ? <Check size={15} /> : <Circle size={10} />}
              </span>
              <b>{s}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
