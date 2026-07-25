import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Car, Truck, Siren, Plane, Ship, Train } from "lucide-react";
import { LoginScreen } from "./components/screens/LoginScreen";
import { RegisterScreen } from "./components/screens/RegisterScreen";
import { HomeScreen } from "./components/screens/HomeScreen";
import { ManualScreen } from "./components/screens/ManualScreen";
import { ScanScreen } from "./components/screens/ScanScreen";
import { ResultsScreen } from "./components/screens/ResultsScreen";
import { DropdownSearchScreen } from "./components/screens/DropdownSearchScreen";
import { HistoryScreen } from "./components/screens/HistoryScreen";
import { CrashEventsScreen } from "./components/screens/CrashEventsScreen";
import { LandingPage } from "./components/screens/LandingPage";
import { Navbar } from "./components/Navbar";

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

function AppContent() {
  const location = useLocation();
  const isLandingPage = location.pathname === "/";

  const [emergency, setEmergency] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Persistent theme state initialized from localStorage or local time fallback
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("vqr_theme") as "light" | "dark" | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? "light" : "dark";
  });

  // Persistent login state initialized from localStorage
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("vqr_is_logged_in") === "true";
  });

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    localStorage.setItem("vqr_is_logged_in", "true");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsProfileOpen(false);
    localStorage.removeItem("vqr_is_logged_in");
  };

  // Sync theme changes to the document root element and localStorage
  useEffect(() => {
    localStorage.setItem("vqr_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Router guard to secure dashboard simulator routes
  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  };

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen transition-colors duration-500 flex flex-col relative overflow-hidden select-none ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}>
      {/* CSS Style Injector for High-Fidelity Background Animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float-blob-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.08); }
          66% { transform: translate(-30px, 35px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float-blob-2 {
          0% { transform: translate(0px, 0px) scale(1.08); }
          33% { transform: translate(-50px, 45px) scale(0.92); }
          66% { transform: translate(45px, -30px) scale(1.04); }
          100% { transform: translate(0px, 0px) scale(1.08); }
        }
        @keyframes float-blob-3 {
          0% { transform: translate(0px, 0px) scale(0.95); }
          50% { transform: translate(40px, 40px) scale(1.06); }
          100% { transform: translate(0px, 0px) scale(0.95); }
        }
        
        /* Scrolling Parallax Divider Lines */
        .scrolling-road-dashes {
          background-image: linear-gradient(90deg, currentColor 50%, transparent 50%);
          background-size: 16px 1px;
          animation: scroll-road-left 0.4s linear infinite;
        }
        .scrolling-road-dashes-fast {
          background-image: linear-gradient(90deg, currentColor 50%, transparent 50%);
          background-size: 14px 1px;
          animation: scroll-road-left 0.22s linear infinite;
        }
        .scrolling-road-dashes-slow {
          background-image: linear-gradient(90deg, currentColor 50%, transparent 50%);
          background-size: 18px 1px;
          animation: scroll-road-left 0.65s linear infinite;
        }
        .scrolling-rail-ties {
          background-image: linear-gradient(90deg, currentColor 15%, transparent 15%);
          background-size: 10px 2px;
          animation: scroll-road-left 0.35s linear infinite;
        }
        .scrolling-water-waves {
          background-image: linear-gradient(90deg, currentColor 40%, transparent 40%);
          background-size: 20px 1px;
          animation: scroll-road-left 0.9s linear infinite;
        }

        @keyframes scroll-road-left {
          from { background-position-x: 0px; }
          to { background-position-x: -20px; }
        }

        /* Stationary Physics Bob / Rumble / Pitch */
        @keyframes plane-pitch {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50% { transform: translateY(-3px) rotate(-1deg); }
        }
        @keyframes train-vibe {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-1.5px); }
        }
        @keyframes ship-rock {
          0%, 100% { transform: translateY(0px) rotate(1.5deg); }
          50% { transform: translateY(-2px) rotate(-1.5deg); }
        }
        @keyframes car-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        @keyframes truck-rumble {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-1px) scaleY(0.98); }
        }
        @keyframes flash-red-blue {
          0%, 100% { color: #ef4444; filter: drop-shadow(0 0 6px #ef4444); }
          50% { color: #3b82f6; filter: drop-shadow(0 0 6px #3b82f6); }
        }

        .animate-plane-pitch { animation: plane-pitch 4.5s ease-in-out infinite; }
        .animate-train-vibe { animation: train-vibe 0.18s linear infinite; }
        .animate-ship-rock { animation: ship-rock 5.5s ease-in-out infinite; }
        .animate-car-bob { animation: car-bob 0.8s ease-in-out infinite; }
        .animate-truck-rumble { animation: truck-rumble 0.22s linear infinite; }
        .animate-flash-siren { animation: flash-red-blue 0.4s infinite steps(2); }

        .bg-grid-scroll {
          background-size: 60px 60px;
          background-image: 
            linear-gradient(to right, ${isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)"} 1px, transparent 1px),
            linear-gradient(to bottom, ${isDark ? "rgba(255, 255, 255, 0.015)" : "rgba(0, 0, 0, 0.015)"} 1px, transparent 1px);
          animation: scroll-grid 40s linear infinite;
        }
        @keyframes scroll-grid {
          0% { background-position: 0 0; }
          100% { background-position: 60px 60px; }
        }
      `}} />

      {/* Global Dynamic Background Canvas */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Neon Aurora Gradient Blobs */}
        <div className={`absolute top-[15%] left-[5%] size-[480px] rounded-full blur-[130px] animate-blob-1 transition-colors duration-500 ${isDark ? "bg-blue-600/10" : "bg-blue-300/10"
          }`} />
        <div className={`absolute bottom-[15%] right-[5%] size-[520px] rounded-full blur-[140px] animate-blob-2 transition-colors duration-500 ${isDark ? "bg-indigo-500/10" : "bg-indigo-200/10"
          }`} />
        <div className={`absolute top-[35%] right-[25%] size-[380px] rounded-full blur-[125px] animate-blob-3 transition-colors duration-500 ${isDark ? "bg-cyan-500/8" : "bg-cyan-200/8"
          }`} />
        {/* Scrollable grid overlay */}
        <div className="absolute inset-0 bg-grid-scroll" />
      </div>

      {/* Stationary Illusion-of-Motion Transport Columns - Hidden on mobile/tablet, displays on margins for large desktops */}
      {!isLandingPage && (
        <>
          {/* Left Column: Air, Rail, Sea */}
          <div className="absolute left-6 lg:left-12 top-32 bottom-20 w-44 hidden xl:flex flex-col justify-between z-0 pointer-events-none">
            {/* Air Transport Node */}
            <div className="w-full relative py-6 border-b border-slate-200/5 dark:border-white/5">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200/10 dark:bg-white/10" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] text-blue-500/20 dark:text-blue-400/15 scrolling-road-dashes mt-3" />
              <div className="relative flex flex-col items-center">
                <Plane size={36} className={`animate-plane-pitch transition-colors duration-500 ${isDark ? "text-blue-400/30" : "text-blue-600/25"
                  }`} />
                <span className="text-[7px] font-mono tracking-widest text-slate-500/40 dark:text-white/20 mt-4 uppercase">Aviation Track</span>
              </div>
            </div>

            {/* Rail Transport Node */}
            <div className="w-full relative py-6 border-b border-slate-200/5 dark:border-white/5">
              <div className="absolute top-1/2 left-0 right-0 h-1 border-t border-b border-slate-200/10 dark:border-white/10" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] text-blue-500/25 dark:text-blue-400/20 scrolling-rail-ties mt-[2px]" />
              <div className="relative flex flex-col items-center">
                <Train size={34} className={`animate-train-vibe transition-colors duration-500 ${isDark ? "text-blue-400/30" : "text-blue-600/25"
                  }`} />
                <span className="text-[7px] font-mono tracking-widest text-slate-500/40 dark:text-white/20 mt-4 uppercase">Transit Rail</span>
              </div>
            </div>

            {/* Marine Transport Node */}
            <div className="w-full relative py-6">
              <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-blue-500/20 dark:bg-blue-400/15" />
              <div className="absolute top-1/2 left-0 right-0 h-[2px] text-blue-500/30 dark:text-blue-400/20 scrolling-water-waves mt-1" />
              <div className="relative flex flex-col items-center">
                <Ship size={36} className={`animate-ship-rock transition-colors duration-500 ${isDark ? "text-blue-400/30" : "text-blue-600/25"
                  }`} />
                <span className="text-[7px] font-mono tracking-widest text-slate-500/40 dark:text-white/20 mt-4 uppercase">Marine Cargo</span>
              </div>
            </div>
          </div>

          {/* Right Column: Road Commuter, Emergency Dispatch, Commercial Truck */}
          <div className="absolute right-6 lg:right-12 top-32 bottom-20 w-44 hidden xl:flex flex-col justify-between z-0 pointer-events-none">
            {/* Road Commuter Node */}
            <div className="w-full relative py-6 border-b border-slate-200/5 dark:border-white/5">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200/10 dark:bg-white/10" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] text-yellow-500/20 dark:text-yellow-500/15 scrolling-road-dashes mt-1" />
              <div className="relative flex flex-col items-center">
                <Car size={32} className={`animate-car-bob transition-colors duration-500 ${isDark ? "text-blue-400/30" : "text-blue-600/25"
                  }`} />
                <span className="text-[7px] font-mono tracking-widest text-slate-500/40 dark:text-white/20 mt-4 uppercase">Commuter Lane</span>
              </div>
            </div>

            {/* Emergency Priority Node */}
            <div className="w-full relative py-6 border-b border-slate-200/5 dark:border-white/5">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200/15 dark:bg-white/15" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] text-red-500/30 dark:text-red-500/20 scrolling-road-dashes-fast mt-1" />
              <div className="relative flex flex-col items-center">
                {/* Emergency Vehicle: Strobe light on top */}
                <div className="relative flex flex-col items-center">
                  <Siren size={11} className="absolute -top-2.5 animate-flash-siren" />
                  <Car size={32} className={`animate-car-bob transition-colors duration-500 ${isDark ? "text-blue-400/35" : "text-blue-600/30"
                    }`} />
                </div>
                <span className="text-[7px] font-mono tracking-[0.25em] text-red-500/40 dark:text-red-400/30 mt-4 uppercase font-black animate-pulse">Rescue Squad</span>
              </div>
            </div>

            {/* Commercial Truck Node */}
            <div className="w-full relative py-6">
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-200/10 dark:bg-white/10" />
              <div className="absolute top-1/2 left-0 right-0 h-[1px] text-slate-500/20 scrolling-road-dashes-slow mt-1" />
              <div className="relative flex flex-col items-center">
                <Truck size={36} className={`animate-truck-rumble transition-colors duration-500 ${isDark ? "text-blue-400/30" : "text-blue-600/25"
                  }`} />
                <span className="text-[7px] font-mono tracking-widest text-slate-500/40 dark:text-white/20 mt-4 uppercase">Heavy Hauler</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Global Floating Capsule Navbar */}
      <Navbar
        theme={theme}
        setTheme={setTheme}
        isLoggedIn={isLoggedIn}
        isProfileOpen={isProfileOpen}
        setIsProfileOpen={setIsProfileOpen}
        onLogout={handleLogout}
      />

      {/* Dynamic Route Viewport */}
      <div className="flex-1 flex flex-col relative z-10 pt-24 md:pt-28">
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage isLoggedIn={isLoggedIn} />} />

          {/* Auth Screens */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/app" replace />
              ) : (
                <main className="flex-1 flex items-center justify-center p-4">
                  <LoginScreen onLoginSuccess={handleLoginSuccess} />
                </main>
              )
            }
          />

          <Route
            path="/register"
            element={
              isLoggedIn ? (
                <Navigate to="/app" replace />
              ) : (
                <main className="flex-1 flex items-center justify-center p-4">
                  <RegisterScreen />
                </main>
              )
            }
          />

          {/* Protected Simulator Routes */}
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <HomeScreen emergency={emergency} setEmergency={setEmergency} />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/manual-entry"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <ManualScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <ScanScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/dropdown-search"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <DropdownSearchScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <HistoryScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/crash-events"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <CrashEventsScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <ResultsScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/results/:id"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <ResultsScreen />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles/:id"
            element={
              <ProtectedRoute>
                <main className="flex-1 flex items-center justify-center p-4">
                  <ResultsScreen />
                </main>
              </ProtectedRoute>
            }
          />

          {/* Fallback Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
