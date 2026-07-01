import { useState } from "react";
import { Link } from "react-router-dom";
import { Siren, Search, Camera, ShieldAlert, Cpu, Sparkles, Check, Home, X, ArrowRight } from "lucide-react";

export function LandingPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [dialogDismissed, setDialogDismissed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-500">
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float-3d-dark {
          0%, 100% {
            transform: perspective(800px) rotateX(2deg) rotateY(-3deg) translateY(0);
            text-shadow: 
              1px 1px 0px #0f172a,
              2px 2px 0px #1e293b,
              3px 3px 5px rgba(0, 0, 0, 0.6);
          }
          50% {
            transform: perspective(800px) rotateX(-2deg) rotateY(3deg) translateY(-6px);
            text-shadow: 
              1px 1px 0px #1e293b,
              2px 2px 0px #3b82f6,
              3px 3px 12px rgba(59, 130, 246, 0.45);
          }
        }
        @keyframes float-3d-light {
          0%, 100% {
            transform: perspective(800px) rotateX(2deg) rotateY(-3deg) translateY(0);
            text-shadow: 
              1px 1px 0px #e2e8f0,
              2px 2px 0px #cbd5e1,
              3px 3px 5px rgba(0, 0, 0, 0.15);
          }
          50% {
            transform: perspective(800px) rotateX(-2deg) rotateY(3deg) translateY(-6px);
            text-shadow: 
              1px 1px 0px #cbd5e1,
              2px 2px 0px #2563eb,
              3px 3px 12px rgba(37, 99, 235, 0.25);
          }
        }
        .animate-text-3d {
          transform-style: preserve-3d;
          display: inline-block;
          animation: float-3d-light 6s infinite ease-in-out;
        }
        .dark .animate-text-3d {
          animation: float-3d-dark 6s infinite ease-in-out;
        }
      `}} />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 lg:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(37,99,235,0.15),transparent_45%)]" />
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Sparkles size={13} />
              <span>OFFLINE RESILIENT FIELD TOOL</span>
            </div>
            <h1 className="mt-6 text-4xl font-black leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-6xl animate-text-3d">
              Second-by-second vehicle intelligence.
            </h1>
            <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
              VQR delivers high-voltage battery cut guides, airbag inflator diagrams, and safety briefings instantly to responders in the field.
            </p>

          </div>

          {/* Ruggedized Tablet Hero Graphic */}
          <div className="relative flex justify-center">
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-indigo-600 opacity-20 blur-2xl" />
            <img
              src="/landing_hero.png"
              alt="VQR ruggedized responder tablet layout interface"
              className="relative w-full max-w-[540px] rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl transition duration-500 hover:scale-[1.02]"
            />
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section id="features" className="scroll-mt-28 relative border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/50 px-6 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Tactical Advantage</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl animate-text-3d">Built for extreme scenarios.</h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Camera,
                title: "Live Camera Scan",
                body: "Point device camera to automatically classify front/rear details and fetch matching guide sheets in real-time.",
              },
              {
                icon: Search,
                title: "Predictive Manual Lookup",
                body: "Fast search bar for search-by-make/model/year. Resolves queries dynamically from cached rescue database.",
              },
              {
                icon: Cpu,
                title: "Local Offline Inference",
                body: "Optimized model logic and JSON data catalogs cache locally on responder devices to guarantee operation in tunnels or remote areas.",
              },
              {
                icon: ShieldAlert,
                title: "High-Voltage Safety Guides",
                body: "Pinpoint high-voltage lines, battery location cuts, gas generator cartridges, and fuel line layouts.",
              },
              {
                icon: Siren,
                title: "Dispatch Automation",
                body: "Trigger instant crash-event sync dispatches to incoming municipal services, hospitals, or squad vehicles.",
              },
              {
                icon: Sparkles,
                title: "Biometric Passkey Entry",
                body: "Instant secure logging via Face ID or fingerprint scans. Keep data encrypted without slow manual password typing in the field.",
              },
            ].map((f, i) => (
              <div
                key={i}
                className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 p-6 shadow-md dark:shadow-none hover:border-blue-500/50 hover:scale-[1.04] hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-blue-900/10 transition-all duration-300 ease-out"
              >
                <div className="grid size-12 place-items-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works / Video Scanning Walkthrough Section */}
      <section id="how-it-works" className="scroll-mt-28 border-t border-slate-200 dark:border-white/10 px-6 py-20 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="order-2 lg:order-1 flex justify-center">
              <div className="relative">
                <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-cyan-500 opacity-20 blur-xl" />
                <img
                  src="/scan_demo.png"
                  alt="VQR camera scan screen layout visualization"
                  className="relative w-full max-w-[360px] rounded-3xl border border-slate-200 dark:border-white/15 shadow-2xl"
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">Operational Walkthrough</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl animate-text-3d">Scan. Identify. Secure.</h2>
              <p className="mt-6 text-slate-600 dark:text-slate-400 leading-relaxed">
                Using VQR in the field takes less than five seconds. The system guides responders through a simple, safe extrication pipeline.
              </p>

              <div className="mt-8 space-y-6">
                {[
                  {
                    step: "01",
                    title: "Open the scan camera",
                    desc: "Point the camera at the vehicle. Use the facing-mode toggle to switch between front or rear cameras.",
                  },
                  {
                    step: "02",
                    title: "Instant visual identification",
                    desc: "Computer vision parses vehicle proportions and grilles to cross-reference matching guidelines automatically.",
                  },
                  {
                    step: "03",
                    title: "Isolate hazards & cut safely",
                    desc: "Interactive overlays reveal cut locations and safety items. Launch briefing videos to inform the crew.",
                  },
                ].map((s, i) => (
                  <div key={i} className="flex gap-4 rounded-2xl p-3 -ml-3 hover:scale-[1.03] hover:bg-blue-500/5 dark:hover:bg-white/5 hover:shadow-lg hover:shadow-blue-100/30 dark:hover:shadow-blue-900/10 transition-all duration-300 ease-out cursor-default">
                    <span className="font-mono text-xl font-black text-blue-600 dark:text-blue-500">{s.step}</span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{s.title}</h4>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Database / Call to Action */}
      <section id="rescue-data" className="scroll-mt-28 border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/50 px-6 py-20 lg:py-32">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-white to-blue-50 dark:from-slate-950 dark:to-blue-950 p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent_60%)] pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl animate-text-3d">Ensure your crew is protected.</h2>
            <p className="mx-auto mt-6 max-w-xl text-slate-600 dark:text-slate-400 leading-relaxed">
              Equip your rescue squads with zero-latency safety guides. Register credentials to sync logs and offline catalogs across tablets.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to={isLoggedIn ? "/app" : "/register"}
                className="rounded-xl bg-blue-600 px-8 py-4 font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition"
              >
                Register Responder Agency
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 dark:border-white/15 bg-slate-100 dark:bg-white/5 px-8 py-4 font-bold text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition"
              >
                Access Account
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-2"><Check size={14} className="text-blue-600 dark:text-blue-400" /> Compliant with rescue guidelines</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-blue-600 dark:text-blue-400" /> Device agnostic camera routing</span>
              <span className="flex items-center gap-2"><Check size={14} className="text-blue-600 dark:text-blue-400" /> Offline cache synchronization</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 px-6 py-8 text-center text-sm text-slate-500 transition-colors duration-500">
        <div className="mx-auto max-w-7xl flex flex-col justify-between gap-4 sm:flex-row">
          <p>© {new Date().getFullYear()} Vehicle Quick Response System. All rights reserved.</p>
          <div className="flex gap-4 justify-center">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <span>·</span>
            <a href="#" className="hover:underline">Responder Terms</a>
          </div>
        </div>
      </footer>

      {/* Floating "Go to Dashboard" dialog — only for logged-in users */}
      {isLoggedIn && !dialogDismissed && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes slideInRight {
              from { transform: translateX(120%); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
            @keyframes beaconPing {
              0%   { transform: scale(1);   opacity: 1; }
              75%  { transform: scale(2.5); opacity: 0; }
              100% { transform: scale(2.5); opacity: 0; }
            }
            .floating-dialog { animation: slideInRight 0.6s cubic-bezier(0.16,1,0.3,1) forwards; }
            .beacon-ping    { animation: beaconPing 2s ease-out infinite; }
          `}} />
          <div className="floating-dialog fixed right-6 bottom-8 z-50 w-72">
            <div className="relative rounded-2xl border border-blue-500/30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl shadow-blue-500/10 p-5">
              {/* Dismiss button */}
              <button
                onClick={() => setDialogDismissed(true)}
                className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-slate-200/80 dark:bg-white/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>

              {/* Beacon dot */}
              <div className="absolute -top-1.5 -left-1.5">
                <span className="block size-3 rounded-full bg-green-500" />
                <span className="absolute inset-0 rounded-full bg-green-400 beacon-ping" />
              </div>

              {/* Content */}
              <div className="flex items-start gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/30">
                  <Home size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">Welcome back, Responder</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">You're logged in. Jump straight to your dashboard.</p>
                </div>
              </div>

              <Link
                to="/app"
                className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-200"
              >
                <Home size={15} />
                Go to Dashboard
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
