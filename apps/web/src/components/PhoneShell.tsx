import React from "react";

export function PhoneShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative mx-auto w-full transition-all duration-500 md:max-w-[840px] overflow-hidden rounded-none md:rounded-[2.5rem] border-0 md:border-[14px] border-slate-300 dark:border-slate-950 bg-slate-200 dark:bg-slate-900 shadow-none md:shadow-2xl ring-0 md:ring-4 ring-black/5 dark:ring-white/5">
      {/* Tablet Camera and Status Indicator - Hidden on mobile, visible on desktop */}
      <div className="hidden md:flex h-10 items-center justify-between px-6 text-[10px] font-bold tracking-[0.24em] transition-colors duration-500 bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-white/50 border-b border-slate-200 dark:border-white/5">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-500 animate-pulse" />
          <span>CONNECTED</span>
        </div>
        <div className="text-slate-800 dark:text-white/80 font-mono">
          {title || "VQR RUGGED TABLET OS"}
        </div>
        <div className="flex items-center gap-3">
          <span>LTE</span>
          <span>100% [🔋]</span>
        </div>
      </div>
      
      {/* Screen Viewport */}
      <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
        {children}
      </div>

      {/* Screen bottom touch indicator bar - Hidden on mobile */}
      <div className="hidden md:flex h-4 items-center justify-center transition-colors duration-500 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5">
        <div className="w-36 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
      </div>
    </div>
  );
}
