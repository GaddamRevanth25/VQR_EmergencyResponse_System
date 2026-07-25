import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { UserRound, Siren, Sun, Moon } from "lucide-react";

interface NavbarProps {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  isLoggedIn: boolean;
  isProfileOpen: boolean;
  setIsProfileOpen: (open: boolean) => void;
  onLogout: () => void;
}

export function Navbar({
  theme,
  setTheme,
  isLoggedIn,
  isProfileOpen,
  setIsProfileOpen,
  onLogout,
}: NavbarProps) {
  const isDark = theme === "dark";
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside detector hook
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isProfileOpen, setIsProfileOpen]);

  return (
    <nav className={`fixed top-4 left-0 right-0 z-50 mx-4 md:mx-auto w-[calc(100%-2rem)] max-w-7xl rounded-full border backdrop-blur-md transition-all duration-500 shrink-0 ${isDark
        ? "border-white/10 bg-slate-950/80 text-white shadow-2xl shadow-black/45"
        : "border-slate-200 bg-white/80 text-slate-900 shadow-xl shadow-slate-200/60"
      }`}>
      <div className="flex items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-3 active:scale-95 transition">
          <div className="grid size-9 place-items-center rounded-full bg-blue-600 shadow-md text-white animate-pulse">
            <Siren size={18} />
          </div>
          <div className="hidden sm:block">
            <span className="font-mono text-[9px] font-black tracking-[0.25em] text-blue-500 block">PROJECT VQR</span>
            <span className="text-base font-black tracking-tight leading-none">Vehicle Quick Response</span>
          </div>
        </Link>

        {/* Global Nav Links */}
        <div className="hidden items-center gap-8 text-sm font-semibold md:flex">
          <a href="/#features" className={`transition ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-950"}`}>Features</a>
          <a href="/#how-it-works" className={`transition ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-950"}`}>How it Works</a>
          <a href="/#rescue-data" className={`transition ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-950"}`}>Safety Catalog</a>
          {isLoggedIn && (
            <Link
              to="/crash-events"
              className={`flex items-center gap-1.5 font-bold transition ${
                isDark ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"
              }`}
            >
              <span className="size-2 rounded-full bg-red-600 animate-ping" />
              Crash Events
            </Link>
          )}
        </div>

        {/* Controls & Auth Area */}
        <div className="flex items-center gap-3 relative">
          {/* Theme Toggle Button (Light/Dark Switcher) */}
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`grid size-9 place-items-center rounded-full border transition cursor-pointer active:scale-90 ${isDark ? "border-white/15 bg-white/5 text-yellow-400 hover:bg-white/10" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {isLoggedIn ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold shadow-sm transition cursor-pointer active:scale-95 ${isDark ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
                  }`}
              >
                <div className="grid size-6 place-items-center rounded-full bg-blue-600 text-white">
                  <UserRound size={12} />
                </div>
                <span className="hidden sm:inline">Responder</span>
              </button>

              {isProfileOpen && (
                <div className={`absolute right-0 mt-2 w-56 rounded-2xl border p-4 shadow-xl z-50 animate-fadeIn ${isDark ? "border-white/10 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-900"
                  }`}>
                  <div className={`flex items-center gap-3 border-b pb-3 mb-3 ${isDark ? "border-white/10" : "border-slate-100"}`}>
                    <div className="grid size-10 place-items-center rounded-full bg-blue-600 text-white font-black">
                      R4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold m-0 leading-none">John Doe</h4>
                      <span className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>responder@vqr.app</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${isDark ? "text-slate-400 bg-white/5" : "text-slate-500 bg-slate-50"}`}>
                      Station 4 · Shift B
                    </div>
                    <Link
                      to="/crash-events"
                      onClick={() => setIsProfileOpen(false)}
                      className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                        isDark ? "text-red-400 hover:bg-white/5" : "text-red-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="size-2 rounded-full bg-red-600 animate-ping" />
                      Crash Monitoring
                    </Link>
                    <button
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/10 transition cursor-pointer text-left"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                to="/login"
                className={`rounded-full border px-5 py-2 text-xs font-bold transition ${isDark ? "border-white/15 bg-white/5 text-white hover:bg-white/10" : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-blue-500 active:scale-95 transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
