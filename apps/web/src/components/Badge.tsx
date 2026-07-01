import React from "react";

export function Badge({
  children,
  tone = "blue",
}: {
  children: React.ReactNode;
  tone?: "blue" | "red" | "amber" | "green" | "slate";
}) {
  const tones = {
    blue: "bg-blue-600 text-white",
    red: "bg-red-600 text-white",
    amber: "bg-amber-400 text-slate-950",
    green: "bg-green-600 text-white",
    slate: "bg-slate-900 text-white",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${tones[tone]}`}>
      {children}
    </span>
  );
}
