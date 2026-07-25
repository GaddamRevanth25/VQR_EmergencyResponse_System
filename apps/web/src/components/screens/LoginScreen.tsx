import { useState } from "react";
import { Link } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff, Check, Fingerprint, ShieldAlert, Phone, Mail } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";
import { apiClient } from "../../lib/api";

type AuthMethod = "phone" | "email";
type AuthFlow = "otp" | "password" | "passkey";

export function LoginScreen({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [method, setMethod] = useState<AuthMethod>("email");
  const [flow, setFlow] = useState<AuthFlow>("password");
  
  // Inputs
  const [email, setEmail] = useState("responder@vqr.app");
  const [password, setPassword] = useState("password123");
  const [phone, setPhone] = useState("+14155550198");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  
  // 2FA / Verification States
  const [tempToken, setTempToken] = useState("");
  const [requires2fa, setRequires2fa] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  
  const [verifyEmailMode, setVerifyEmailMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [passkeyState, setPasskeyState] = useState<"idle" | "scanning" | "done">("idle");

  const handleSendOtp = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    try {
      await apiClient.requestOtp({ phone: phone.trim() });
      setOtpSent(true);
      setInfoMsg("OTP sent successfully to your registered phone number.");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const payload = method === "email"
      ? { loginType: "email_password" as const, email: email.trim(), password }
      : { loginType: "phone_otp" as const, phone: phone.trim(), otp };

    try {
      const res = await apiClient.login(payload);
      if (res.requires2fa && res.tempToken) {
        setTempToken(res.tempToken);
        setRequires2fa(true);
        setInfoMsg("Two-factor authentication code sent via Email/SMS.");
      } else if (res.accessToken) {
        // Store session tokens
        localStorage.setItem("vqr_access_token", res.accessToken);
        localStorage.setItem("vqr_user_info", JSON.stringify(res.user));
        onLoginSuccess();
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("not been confirmed")) {
        setVerifyEmailMode(true);
        setInfoMsg("Please confirm your email using the 6-digit verification code sent during registration.");
      } else {
        setErrorMsg(msg || "Login failed. Please verify credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.verify2fa({
        email: email.trim(),
        code: twoFaCode,
        tempToken,
      });
      if (res.accessToken) {
        localStorage.setItem("vqr_access_token", res.accessToken);
        localStorage.setItem("vqr_user_info", JSON.stringify(res.user));
        onLoginSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired 2FA code.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      await apiClient.confirmEmail({
        email: email.trim(),
        code: verificationCode,
      });
      setVerifyEmailMode(false);
      setInfoMsg("Email confirmed successfully! You can now log in.");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  async function computeHMAC(secret: string, message: string) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      messageData
    );

    const hashArray = Array.from(new Uint8Array(signature));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function handlePasskey() {
    const secret = localStorage.getItem("vqr_biometric_secret");
    if (!secret) {
      setErrorMsg("Biometrics not enrolled on this device. Please sign in with password first and enroll biometrics in your profile preferences.");
      return;
    }
    if (!email) {
      setErrorMsg("Please enter your registered email ID above to locate your biometric credentials.");
      return;
    }

    setPasskeyState("scanning");
    setErrorMsg(null);
    setInfoMsg(null);

    setTimeout(async () => {
      try {
        const timestamp = Date.now().toString();
        const signature = await computeHMAC(secret, timestamp);

        const res = await apiClient.login({
          loginType: "biometric" as const,
          email: email.trim(),
          biometricToken: `${timestamp}:${signature}`,
          deviceId: "web-browser"
        });

        setPasskeyState("done");
        setTimeout(() => {
          if (res.accessToken) {
            localStorage.setItem("vqr_access_token", res.accessToken);
            localStorage.setItem("vqr_user_info", JSON.stringify(res.user));
            onLoginSuccess();
          }
        }, 1000);
      } catch (err: any) {
        setPasskeyState("idle");
        setErrorMsg(err.message || "Biometric verification failed.");
      }
    }, 2200);
  }

  async function handle2faPasskey() {
    const secret = localStorage.getItem("vqr_biometric_secret");
    if (!secret) {
      setErrorMsg("Biometrics not enrolled on this device.");
      return;
    }
    
    setPasskeyState("scanning");
    setErrorMsg(null);
    setInfoMsg(null);

    setTimeout(async () => {
      try {
        const timestamp = Date.now().toString();
        const signature = await computeHMAC(secret, timestamp);

        const res = await apiClient.verify2fa({
          email: email.trim(),
          code: `${timestamp}:${signature}`,
          tempToken,
        });

        setPasskeyState("done");
        setTimeout(() => {
          if (res.accessToken) {
            localStorage.setItem("vqr_access_token", res.accessToken);
            localStorage.setItem("vqr_user_info", JSON.stringify(res.user));
            onLoginSuccess();
          }
        }, 1000);
      } catch (err: any) {
        setPasskeyState("idle");
        setErrorMsg(err.message || "Biometric 2FA verification failed.");
      }
    }, 2200);
  }

  return (
    <PhoneShell title="SECURE SIGN IN">
      <div className="min-h-[720px] bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 p-5 text-white flex flex-col justify-between">
        <div className="max-w-md mx-auto w-full">
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

          {/* ── Status Messages ── */}
          {errorMsg && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-400 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="mt-4 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-400 font-medium">
              ℹ️ {infoMsg}
            </div>
          )}

          {/* ── 2FA Screen ── */}
          {requires2fa && (
            <form onSubmit={handleVerify2fa} className="mt-6 space-y-4">
              <h3 className="text-xl font-extrabold text-blue-400">Two-Factor Authentication</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                A verification code has been dispatched. Enter the 6-digit security code below to confirm identity.
              </p>
              <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">6-Digit Code</span>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 123456"
                  className="mt-1 w-full bg-transparent text-lg font-bold text-white outline-none tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Confirm Security Code"}
              </button>
              {localStorage.getItem("vqr_biometric_secret") && (
                <button
                  type="button"
                  onClick={handle2faPasskey}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 py-4 font-bold text-blue-300 transition active:scale-[0.98] cursor-pointer"
                >
                  <Fingerprint size={18} />
                  {passkeyState === "scanning" ? "Scanning Fingerprint..." : "Verify with Passkey"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setRequires2fa(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white mt-2 cursor-pointer underline"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Email Verification Code Confirm Screen ── */}
          {!requires2fa && verifyEmailMode && (
            <form onSubmit={handleConfirmEmail} className="mt-6 space-y-4">
              <h3 className="text-xl font-extrabold text-blue-400">Verify Email Address</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter the 6-digit email confirmation code generated during registration.
              </p>
              <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Confirmation Code</span>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 654321"
                  className="mt-1 w-full bg-transparent text-lg font-bold text-white outline-none tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Confirm Verification Code"}
              </button>
              <button
                type="button"
                onClick={() => setVerifyEmailMode(false)}
                className="w-full text-center text-xs text-slate-400 hover:text-white mt-2 cursor-pointer underline"
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* ── Standard Login Screens ── */}
          {!requires2fa && !verifyEmailMode && (
            <div className="mt-6">
              {/* Contact method tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
                <button
                  type="button"
                  onClick={() => { setMethod("phone"); setFlow("otp"); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${method === "phone" ? "bg-white text-slate-950" : "text-white/70"}`}
                >
                  <Phone size={17} /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod("email"); setFlow("password"); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 font-bold transition ${method === "email" ? "bg-white text-slate-950" : "text-white/70"}`}
                >
                  <Mail size={17} /> Email
                </button>
              </div>

              {/* Input for contact info */}
              <div className="mt-4">
                {method === "phone" ? (
                  <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Mobile number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +14155550198"
                      className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
                    />
                  </label>
                ) : (
                  <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Email ID</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. responder@vqr.app"
                      className="mt-2 w-full bg-transparent text-lg font-bold text-white outline-none"
                    />
                  </label>
                )}
              </div>

              {/* Auth flow tabs */}
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-white/10 p-1 text-[13px]">
                {(["otp", "password", "passkey"] as AuthFlow[]).map((f) => {
                  const labels = { otp: "OTP", password: "Password", passkey: "Passkey" };
                  return (
                    <button
                      key={f}
                      onClick={() => { setFlow(f); setOtpSent(false); setPasskeyState("idle"); }}
                      className={`rounded-lg py-2 font-bold transition ${flow === f ? "bg-white text-slate-950" : "text-white/60 hover:text-white"}`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {/* ── OTP flow ── */}
              {flow === "otp" && (
                <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
                  {otpSent ? (
                    <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Verification OTP</span>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="6-digit OTP code"
                        className="mt-1 w-full bg-transparent text-lg font-bold text-white outline-none tracking-widest"
                      />
                    </label>
                  ) : null}

                  {otpSent ? (
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Verify & Sign In"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleSendOtp}
                      className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Send SMS One-Time Passcode"}
                    </button>
                  )}
                  
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Can't receive OTP?{" "}
                    <button type="button" onClick={() => setFlow("password")} className="font-bold text-blue-300 underline">
                      Use password instead
                    </button>
                  </p>
                </form>
              )}

              {/* ── Password flow ── */}
              {flow === "password" && (
                <form onSubmit={handleLoginSubmit} className="mt-4 space-y-4">
                  <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                    <Lock size={18} className="shrink-0 text-slate-300" />
                    <div className="flex-1">
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Password</span>
                      <input
                        required
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                      />
                    </div>
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </label>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Signing in..." : "Sign In with Password"}
                  </button>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    <button type="button" onClick={() => setFlow("otp")} className="font-bold text-blue-300 underline">
                      Use OTP instead
                    </button>
                  </p>
                </form>
              )}

              {/* ── Passkey / Biometrics flow ── */}
              {flow === "passkey" && (
                <div className="mt-4">
                  <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-7">
                    <button
                      type="button"
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
                            Tap the sensor above or use your device's biometric authenticator
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
                  </div>
                  <p className="mt-3 text-center text-xs text-slate-400">
                    No passkey set up?{" "}
                    <button type="button" onClick={() => setFlow("otp")} className="font-bold text-blue-300 underline">
                      Sign in with OTP
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Don't have an account */}
          <p className="mt-6 text-center text-sm text-slate-300 dark:text-slate-400">
            Don't have a responder account?{" "}
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
