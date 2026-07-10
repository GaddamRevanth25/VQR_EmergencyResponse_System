import React from "react";
import { Link } from "react-router-dom";
import { Home, Clock, BookOpen } from "lucide-react";

export function PhoneShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative mx-auto w-full transition-all duration-500 md:max-w-[840px] overflow-hidden rounded-none md:rounded-[2.5rem] border-0 md:border-[14px] border-slate-300 dark:border-slate-950 bg-slate-200 dark:bg-slate-900 shadow-none md:shadow-2xl ring-0 md:ring-4 ring-black/5 dark:ring-white/5">
      {/* Tablet Camera and Status Indicator */}
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
      <div className="bg-slate-50 dark:bg-slate-950 transition-colors duration-500 relative min-h-[720px] pb-20 flex flex-col justify-between">
        <div className="flex-1">
          {children}
        </div>

        {/* Global Footer Navigation Component of PhoneShell */}
        <div className="absolute inset-x-6 bottom-4 z-40">
          <div className="relative flex justify-around rounded-2xl border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 py-3 text-slate-500 dark:text-slate-400 shadow-lg">
            {/* Home Icon */}
            <Link to="/app" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              <Home size={22} />
            </Link>

            {/* History Icon (Routes to Search Cache & Preferences Screen) */}
            <Link to="/history" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              <Clock size={22} />
            </Link>

            {/* Browse Icon */}
            <Link to="/dropdown-search" className="hover:text-blue-600 dark:hover:text-blue-400 transition">
              <BookOpen size={22} />
            </Link>
          </div>
        </div>
      </div>

      {/* Screen bottom touch indicator bar */}
      <div className="hidden md:flex h-4 items-center justify-center transition-colors duration-500 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-white/5">
        <div className="w-36 h-1 rounded-full bg-slate-300 dark:bg-white/20" />
      </div>
    </div>
  );
}
