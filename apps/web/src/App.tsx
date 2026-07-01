import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Car,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Eye,
  EyeOff,
  FileImage,
  Fingerprint,
  Flashlight,
  Home,
  KeyRound,
  Lock,
  Mail,
  MapPin,
  Menu,
  Phone,
  Play,
  Radio,
  ScanLine,
  Search,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  Upload,
  UserRound,
  X,
} from "lucide-react";

// ─── Data ────────────────────────────────────────────────────────────────────
// TODO: Reconnect these static lists to the live apiClient data loader later.
const vehicles = [
  { name: "Toyota Camry", year: "2024", match: "98%", vin: "VQR-7C2-941", color: "bg-blue-600" },
  { name: "Honda Accord", year: "2023", match: "86%", vin: "VQR-2AF-108", color: "bg-slate-700" },
  { name: "Ford F-150 Lightning", year: "2022", match: "79%", vin: "VQR-EV-512", color: "bg-amber-500" },
];

const savedTravels = [
  { route: "Bay Bridge incident response", date: "Today, 08:42", vehicle: "Toyota Camry 2024", scans: "3 scans" },
  { route: "I-280 northbound assist", date: "Yesterday, 19:18", vehicle: "F-150 Lightning", scans: "1 scan" },
  { route: "Mission St. vehicle check", date: "Jun 27, 14:06", vehicle: "Honda Accord", scans: "2 scans" },
];

const safety = [
  {
    title: "High-Voltage Battery",
    priority: "Critical",
    body: "Avoid orange cabling. Stabilize vehicle and isolate 12V before cutting pillars or floor pan.",
    color: "bg-red-600 text-white",
  },
  {
    title: "Emergency Shutoff",
    priority: "High",
    body: "Primary service disconnect is beneath rear passenger seat; secondary is under hood left rail.",
    color: "bg-amber-500 text-slate-950",
  },
  {
    title: "Airbag Inflators",
    priority: "Medium",
    body: "Side curtain inflators run along roof rail. Maintain 10 inch clearance during extrication.",
    color: "bg-blue-600 text-white",
  },
];

// ─── Atoms ────────────────────────────────────────────────────────────────────

function PhoneShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[2rem] border border-slate-900/10 bg-card shadow-2xl shadow-slate-900/20 ring-8 ring-slate-900/5">
      <div className="flex h-8 items-center justify-center border-b bg-slate-950 text-[10px] font-semibold tracking-[0.28em] text-white/70">
        {title || "VQR FIELD"}
      </div>
      {children}
    </div>
  );
}

function Badge({
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

// ─── Login Screen (Kept as secondary mockup screen) ───────────────────────────

type AuthMethod = "phone" | "email";
type AuthFlow = "otp" | "password" | "passkey";

function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [method, setMethod] = useState<AuthMethod>("phone");
  const [flow, setFlow] = useState<AuthFlow>("otp");
  const [otpSent, setOtpSent] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [passkeyState, setPasskeyState] = useState<"idle" | "scanning" | "done">("idle");

  function handlePasskey() {
    setPasskeyState("scanning");
    setTimeout(() => {
      setPasskeyState("done");
      setTimeout(() => onLoginSuccess(), 1000);
    }, 2200);
  }

  return (
    <PhoneShell title="SECURE SIGN IN">
      <div className="min-h-[720px] bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 p-5 text-white">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="grid size-12 place-items-center rounded-2xl bg-blue-600">
            <KeyRound />
          </div>
          <Badge tone="green">Encrypted</Badge>
        </div>

        {/* Title */}
        <div className="mt-8">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-blue-300">VQR account</p>
          <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.02em]">
            Save every scan, trip and preference.
          </h2>
        </div>

        {/* Contact method tabs */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
          <button
            onClick={() => setMethod("phone")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${
              method === "phone" ? "bg-white text-slate-950" : "text-white/70"
            }`}
          >
            <Phone size={17} /> Phone
          </button>
          <button
            onClick={() => setMethod("email")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${
              method === "email" ? "bg-white text-slate-950" : "text-white/70"
            }`}
          >
            <Mail size={17} /> Email
          </button>
        </div>

        {/* Contact input */}
        <label className="mt-4 block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            {method === "phone" ? "Mobile number" : "Email ID"}
          </span>
          <input
            readOnly
            value={method === "phone" ? "+1 415 555 0198" : "responder@vqr.app"}
            className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
          />
        </label>

        {/* Auth flow tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1 text-[13px]">
          {(["otp", "password", "passkey"] as AuthFlow[]).map((f) => {
            const labels = { otp: "OTP", password: "Password", passkey: "Passkey" };
            return (
              <button
                key={f}
                onClick={() => { setFlow(f); setOtpSent(false); setPasskeyState("idle"); }}
                className={`rounded-lg py-2 font-bold transition ${
                  flow === f ? "bg-white text-slate-950" : "text-white/60 hover:text-white"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>

        {/* ── OTP flow ── */}
        {flow === "otp" && (
          <>
            {otpSent && (
              <div className="mt-4 grid grid-cols-6 gap-2">
                {["4", "8", "1", "2", "9", "6"].map((n, i) => (
                  <div
                    key={`otp-${i}`}
                    className="grid h-12 place-items-center rounded-xl border border-blue-300/30 bg-white text-xl font-black text-slate-950"
                  >
                    {n}
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                if (otpSent) {
                  onLoginSuccess();
                } else {
                  setOtpSent(true);
                }
              }}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
            >
              {otpSent ? "Verify & continue" : `Send SMS one-time passcode`}
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Can&apos;t receive OTP?{" "}
              <button onClick={() => setFlow("password")} className="font-bold text-blue-300 underline">
                Use password instead
              </button>
            </p>
          </>
        )}

        {/* ── Password flow ── */}
        {flow === "password" && (
          <>
            <label className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
              <Lock size={18} className="shrink-0 text-slate-300" />
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Password</span>
                <input
                  type={showPass ? "text" : "password"}
                  readOnly
                  value="••••••••••••"
                  className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                />
              </div>
              <button onClick={() => setShowPass(!showPass)} className="text-slate-400">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </label>
            <button
              onClick={() => onLoginSuccess()}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
            >
              Sign in with password
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              <button className="font-bold text-blue-300 underline">Forgot password?</button>
              &nbsp;&nbsp;·&nbsp;&nbsp;
              <button onClick={() => setFlow("otp")} className="font-bold text-blue-300 underline">
                Use OTP instead
              </button>
            </p>
          </>
        )}

        {/* ── Passkey / Biometrics flow ── */}
        {flow === "passkey" && (
          <>
            <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-7">
              <button
                onClick={handlePasskey}
                className={`grid size-24 place-items-center rounded-full border-4 transition active:scale-95 ${
                  passkeyState === "scanning"
                    ? "animate-pulse border-blue-400 bg-blue-600/30"
                    : passkeyState === "done"
                    ? "border-green-400 bg-green-600/20"
                    : "border-white/30 bg-white/10"
                }`}
              >
                {passkeyState === "done" ? (
                  <Check size={40} className="text-green-300" />
                ) : (
                  <Fingerprint size={40} className={passkeyState === "scanning" ? "text-blue-300" : "text-white/80"} />
                )}
              </button>

              <div className="text-center">
                {passkeyState === "idle" && (
                  <>
                    <p className="font-bold">Touch ID · Face ID · Device PIN</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Tap the sensor above or use your device&apos;s biometric authenticator
                    </p>
                  </>
                )}
                {passkeyState === "scanning" && (
                  <p className="font-bold text-blue-300">Verifying biometric…</p>
                )}
                {passkeyState === "done" && (
                  <p className="font-bold text-green-300">Identity confirmed — signing you in</p>
                )}
              </div>

              {passkeyState === "idle" && (
                <div className="flex flex-wrap justify-center gap-2">
                  {["Face ID", "Touch ID", "Windows Hello", "Security Key"].map((opt) => (
                    <span
                      key={opt}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">
              No passkey set up?{" "}
              <button onClick={() => setFlow("otp")} className="font-bold text-blue-300 underline">
                Sign in with OTP
              </button>
            </p>
          </>
        )}

        {/* Why sign in */}
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/10 p-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-amber-300" />
            <b>Why sign in?</b>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
            <li>• Previous travels and scan history sync across devices</li>
            <li>• Emergency contacts, medical notes, and dark mode saved</li>
            <li>• Offline cache restores your last vehicle guides in the field</li>
          </ul>
        </div>
      </div>
    </PhoneShell>
  );
}

// ─── Saved Profile Panel ──────────────────────────────────────────────────────

function SavedProfilePanel() {
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

// ─── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ emergency, setEmergency }: { emergency: boolean; setEmergency: (v: boolean) => void }) {
  return (
    <PhoneShell title="VQR HOME">
      <div className="relative min-h-[720px] bg-gradient-to-b from-white to-slate-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-blue-600 text-white">
              <Siren size={22} />
            </div>
            <div>
              <p className="font-mono text-xs font-bold tracking-[0.22em] text-blue-700">VQR</p>
              <h1 className="text-xl font-extrabold leading-none">Vehicle Quick Response</h1>
            </div>
          </div>
          <button
            onClick={() => setEmergency(!emergency)}
            className={`relative h-8 w-14 rounded-full p-1 transition ${emergency ? "bg-red-600" : "bg-slate-300"}`}
          >
            <span className={`block size-6 rounded-full bg-white transition ${emergency ? "translate-x-6" : ""}`} />
          </button>
        </div>

        {emergency && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
            <span className="size-2 animate-ping rounded-full bg-red-600" />
            <b>Emergency Mode armed</b>
          </div>
        )}

        <div className="mt-10 text-center">
          <Badge tone="green">Responder ready</Badge>
          <h2 className="mt-5 text-4xl font-extrabold leading-[1.02] tracking-[-0.02em]">
            Identify a vehicle in seconds.
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-slate-600">
            Fast safety guidance, match confidence, and future crash dispatch flows in one uncluttered field interface.
          </p>
        </div>

        <div className="mt-8 grid gap-4">
          {[
            { icon: Search, title: "Enter Vehicle Details", sub: "Make, model, year", color: "bg-blue-600", path: "/manual-entry" },
            { icon: Camera, title: "Camera Scan", sub: "Identify via photo", color: "bg-slate-950", path: "/scan" },
          ].map((a) => (
            <Link
              key={a.title}
              to={a.path}
              className="group flex min-h-[7.5rem] items-center gap-4 rounded-2xl border bg-white p-5 text-left shadow-sm transition active:scale-[0.98]"
            >
              <div className={`grid size-14 place-items-center rounded-2xl ${a.color} text-white`}>
                <a.icon />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{a.title}</h3>
                <p className="text-slate-500">{a.sub}</p>
              </div>
              <ChevronRight className="text-slate-400 transition group-hover:translate-x-1" />
            </Link>
          ))}
        </div>

        {/* Footer Navigation */}
        <div className="absolute inset-x-6 bottom-4 flex justify-around rounded-2xl border bg-white/95 py-3 text-slate-500 shadow-lg">
          <Link to="/"><Home className="text-blue-600" /></Link>
          <Link to="/manual-entry"><Clock3 /></Link>
          <Link to="/results"><ShieldAlert /></Link>
        </div>
      </div>
    </PhoneShell>
  );
}

// ─── Manual Entry Screen ──────────────────────────────────────────────────────

function ManualScreen() {
  return (
    <PhoneShell title="MANUAL ENTRY">
      <div className="min-h-[720px] bg-slate-50 p-5 pb-24 relative">
        <div className="flex items-center gap-3">
          <Link to="/"><ArrowLeft className="text-slate-900" /></Link>
          <h2 className="text-2xl font-extrabold">Manual Entry</h2>
        </div>

        {/* Inputs */}
        <div className="mt-6 space-y-3">
          {["Make", "Model", "Year"].map((l, i) => (
            <label key={l} className="block rounded-2xl border bg-white px-4 py-2 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{l}</span>
              <input
                value={i === 0 ? "Toyota" : i === 1 ? "Camry" : "2024"}
                readOnly
                className="mt-1 w-full bg-transparent font-semibold outline-none"
              />
            </label>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Predictive matches updated from local rescue database.
        </div>

        {/* Matching Vehicles */}
        <div className="mt-5 space-y-3">
          {vehicles.map((v) => (
            <Link
              to="/results"
              key={v.vin}
              className="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm text-slate-900 hover:bg-slate-50 transition block"
            >
              <div className="flex items-center gap-3 w-full">
                <div className={`grid size-16 place-items-center rounded-xl ${v.color} text-white`}>
                  <Car />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-left">
                    {v.name} {v.year}
                  </h3>
                  <p className="font-mono text-xs text-slate-500 text-left">{v.vin}</p>
                </div>
                <Badge tone="green">{v.match}</Badge>
              </div>
            </Link>
          ))}
        </div>

        <div className="absolute inset-x-6 bottom-4 rounded-t-[1.5rem] bg-slate-900 p-4 text-center font-mono text-xs text-white/70">
          keyboard active preview · content pushed above safe area
        </div>
      </div>
    </PhoneShell>
  );
}

// ─── Camera Scan Screen ───────────────────────────────────────────────────────

function ScanScreen() {
  return (
    <PhoneShell title="CAMERA SCAN">
      <div className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(37,99,235,.35),transparent_38%),linear-gradient(135deg,rgba(255,255,255,.08)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.08)_50%,rgba(255,255,255,.08)_75%,transparent_75%)] bg-[length:100%_100%,24px_24px]" />

        <div className="relative flex items-center justify-between p-5">
          <Link to="/"><Menu className="text-white" /></Link>
          <p className="font-semibold">Align vehicle in frame</p>
          <Flashlight />
        </div>

        {/* Simulated Shutter Box */}
        <div className="relative mx-8 mt-20 aspect-[4/3] animate-pulse border-2 border-white/70">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-blue-400 shadow-[0_0_24px_#60a5fa]" />
          <span className="absolute -left-1 -top-1 size-10 border-l-4 border-t-4 border-blue-400" />
          <span className="absolute -right-1 -top-1 size-10 border-r-4 border-t-4 border-blue-400" />
          <span className="absolute -bottom-1 -left-1 size-10 border-b-4 border-l-4 border-blue-400" />
          <span className="absolute -bottom-1 -right-1 size-10 border-b-4 border-r-4 border-blue-400" />
        </div>

        <div className="relative mx-6 mt-8 rounded-2xl border border-white/15 bg-white/10 p-4 text-center backdrop-blur">
          <p className="font-mono text-sm">
            Analyzing vehicle… <b className="text-green-300">72%</b>
          </p>
        </div>

        {/* Scanner Action Buttons */}
        <div className="absolute inset-x-0 bottom-8 flex items-center justify-around">
          <FileImage className="text-white/60" />
          <Link
            to="/results"
            className="size-[72px] rounded-full border-4 border-white bg-white/10 shadow-2xl active:scale-95 block"
          />
          <Upload className="text-white/60" />
        </div>
      </div>
    </PhoneShell>
  );
}

// ─── Results Screen ───────────────────────────────────────────────────────────

function ResultsScreen() {
  const [open, setOpen] = useState(0);

  return (
    <PhoneShell title="RESULTS">
      <div className="relative min-h-[720px] bg-white pb-24">
        {/* Results Header */}
        <div className="bg-slate-950 p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/"><ArrowLeft className="text-white" size={18} /></Link>
            <p className="font-mono text-xs text-blue-300">VQR-7C2-941</p>
          </div>
          <div className="flex items-start justify-between">
            <h2 className="text-3xl font-extrabold leading-none">Toyota Camry 2024</h2>
            <Badge tone="green">98% match</Badge>
          </div>
          <div className="mt-5 flex gap-2 overflow-hidden">
            <Badge tone="slate">Accord 86%</Badge>
            <Badge tone="slate">Civic 82%</Badge>
            <Badge tone="slate">Corolla 75%</Badge>
          </div>
        </div>

        <div className="p-5">
          <h3 className="mb-3 text-lg font-extrabold">Safety Guidelines</h3>
          <div className="space-y-3">
            {/* TODO: Reconnect safety guidelines dynamically from API client */}
            {safety.map((s, i) => (
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                key={s.title}
                className="w-full rounded-2xl border bg-slate-50 p-4 text-left transition hover:bg-white cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <b>{s.title}</b>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-widest ${s.color}`}>
                    {s.priority}
                  </span>
                </div>
                {open === i && <p className="mt-3 text-sm leading-6 text-slate-600">{s.body}</p>}
              </button>
            ))}
          </div>

          <h3 className="mb-3 mt-6 text-lg font-extrabold">Vehicle Features</h3>
          <div className="flex flex-wrap gap-2">
            {["Hybrid system", "Side curtain airbags", "Reinforced B-pillar", "Smart key", "Li-ion pack"].map((f) => (
              <span key={f} className="rounded-full bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                {f}
              </span>
            ))}
          </div>

          {/* Video briefing */}
          <div className="mt-6 overflow-hidden rounded-2xl bg-slate-950 text-white">
            <div className="grid aspect-video place-items-center bg-gradient-to-br from-slate-800 to-blue-950">
              {/* TODO: Reconnect live video playback from backend API (formerly vehicle.videoUrl) */}
              <Play className="size-14 rounded-full bg-white/15 p-3 cursor-pointer" />
            </div>
            <div className="p-4">
              <b>Safety briefing video</b>
              <div className="mt-3 h-1.5 rounded-full bg-white/20">
                <div className="h-full w-1/3 rounded-full bg-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Reset Scan */}
        <div className="absolute inset-x-5 bottom-5">
          <Link
            to="/scan"
            className="w-full rounded-2xl bg-blue-600 py-4 font-bold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] text-center block"
          >
            Start New Scan
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}

// ─── Emergency Panel ──────────────────────────────────────────────────────────

function EmergencyPanel() {
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

// ─── Web Companion ────────────────────────────────────────────────────────────

function WebCompanion() {
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

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [emergency, setEmergency] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-background p-4 text-foreground md:p-8 flex items-center justify-center">
        <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />
      </main>
    );
  }

  return (
    <BrowserRouter>
      <main className="min-h-screen bg-background p-4 text-foreground md:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Page header */}
          <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.26em] text-blue-700">
                VQR design system / prototype
              </p>
              <h1 className="mt-2 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.02em] md:text-7xl">
                Emergency vehicle intelligence, securely remembered.
              </h1>
            </div>
            <div className="flex gap-2">
              <Badge tone="blue">Light</Badge>
              <Badge tone="red">Crash alert</Badge>
              <Badge tone="green">OTP · Password · Passkey</Badge>
            </div>
          </header>

          {/* Phone Screen Mock Area */}
          <section className="flex justify-center py-6">
            <Routes>
              <Route path="/" element={<HomeScreen emergency={emergency} setEmergency={setEmergency} />} />
              <Route path="/login" element={<LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />} />
              <Route path="/manual-entry" element={<ManualScreen />} />
              <Route path="/scan" element={<ScanScreen />} />
              <Route path="/results" element={<ResultsScreen />} />
              <Route path="/vehicles/:id" element={<ResultsScreen />} />
            </Routes>
          </section>

          {/* Saved profile */}
          <section className="mt-8">
            <SavedProfilePanel />
          </section>

          {/* Emergency + dispatch */}
          <section className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.15fr]">
            <EmergencyPanel />
            <WebCompanion />
          </section>

          {/* Component atoms */}
          <section className="mt-8 rounded-[2rem] border bg-card p-6">
            <h2 className="text-2xl font-extrabold">Component library atoms</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white active:scale-95 cursor-pointer">Primary</button>
              <button className="rounded-xl bg-slate-200 px-5 py-3 font-bold text-slate-900 active:scale-95 cursor-pointer">Secondary</button>
              <button className="rounded-xl border px-5 py-3 font-bold active:scale-95 cursor-pointer">Ghost</button>
              <Badge tone="red">Critical</Badge>
              <Badge tone="amber">High</Badge>
              <Badge tone="blue">Medium</Badge>
              <Badge tone="green">Low</Badge>
              <span className="rounded-xl border bg-white px-4 py-3 font-mono text-sm font-bold">98% CONFIDENCE</span>
              <span className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
                <Radio size={18} /> Offline resilient
              </span>
              <span className="flex items-center gap-2 rounded-xl border bg-white px-4 py-3">
                <Fingerprint size={18} className="text-blue-600" /> Passkey ready
              </span>
            </div>
          </section>
        </div>
      </main>
    </BrowserRouter>
  );
}
