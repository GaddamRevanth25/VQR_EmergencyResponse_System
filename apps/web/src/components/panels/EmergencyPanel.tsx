import { Siren, X } from "lucide-react";

export function EmergencyPanel() {
  return (
    <div className="rounded-[2rem] border border-red-200 bg-red-600 p-6 text-white shadow-2xl shadow-red-900/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Siren className="size-9" />
          <div>
            <p className="font-mono text-xs font-bold tracking-[0.2em]">PHASE 6</p>
            <h2 className="text-2xl font-extrabold">Potential crash detected</h2>
          </div>
        </div>
        <X className="cursor-pointer" />
      </div>
      <div className="my-8 text-center">
        <div className="animate-pulse text-7xl font-black tabular-nums">00:30</div>
        <p className="mt-2 font-semibold">Alert sends automatically unless canceled.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {/* TODO: Reconnect emergency alert dispatch controls via apiClient.triggerAlert() */}
        <button className="rounded-2xl bg-white px-4 py-4 font-bold text-red-700 active:scale-95 cursor-pointer">
          I&apos;m OK — Cancel
        </button>
        <button className="rounded-2xl bg-slate-950 px-4 py-4 font-bold text-white active:scale-95 cursor-pointer">
          SOS — Send Now
        </button>
      </div>
    </div>
  );
}
