import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff, Check, Fingerprint, ShieldAlert, Phone, Mail } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";

type AuthMethod = "phone" | "email";
type AuthFlow = "otp" | "password" | "passkey";

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
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
        <div className="max-w-md mx-auto">
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
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${method === "phone" ? "bg-white text-slate-950" : "text-white/70"
                }`}
            >
              <Phone size={17} /> Phone
            </button>
            <button
              onClick={() => setMethod("email")}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${method === "email" ? "bg-white text-slate-950" : "text-white/70"
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
                  className={`rounded-lg py-2 font-bold transition ${flow === f ? "bg-white text-slate-950" : "text-white/60 hover:text-white"
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
                  className={`grid size-24 place-items-center rounded-full border-4 transition active:scale-95 ${passkeyState === "scanning"
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

          {/* Don't have an account */}
          <p className="mt-6 text-center text-sm text-slate-300 dark:text-slate-400">
            Don&apos;t have a responder account?{" "}
            <Link to="/register" className="font-bold text-blue-400 dark:text-cyan-400 hover:underline">
              Register here
            </Link>
          </p>

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
      </div>
    </PhoneShell>
  );
}
