import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldAlert, KeyRound, Mail, Phone, User, CheckCircle } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";
import { apiClient } from "../../lib/api";

export function RegisterScreen() {
  const navigate = useNavigate();
  
  // Inputs
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@station4.gov");
  const [phone, setPhone] = useState("+14155550198");
  const [password, setPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("password123");
  
  // States
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  // Email confirmation state after signup
  const [verifyMode, setVerifyMode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role: "User",
      password: password,
    };

    try {
      await apiClient.register(payload);
      setVerifyMode(true);
      setInfoMsg("Registration successful! A 6-digit confirmation code has been generated. Please check your email or auth logs.");
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed. Email or phone number might already be in use.");
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
      setInfoMsg("Email verified successfully! Redirecting to login...");
      setVerifyMode(false);
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PhoneShell title="RESPONDER REGISTER">
      <div className="min-h-[720px] bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 p-5 text-white flex flex-col justify-between">
        <div className="max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-600">
              <KeyRound />
            </div>
            <Badge tone="blue">Secure</Badge>
          </div>

          {/* Title */}
          <div className="mt-8">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.24em] text-blue-300">VQR responder sign up</p>
            <h2 className="mt-3 text-3xl font-black leading-[1.05] tracking-[-0.02em]">
              Create your responder credentials.
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

          {/* ── Email Verification Mode ── */}
          {verifyMode ? (
            <form onSubmit={handleConfirmEmail} className="mt-6 space-y-4">
              <h3 className="text-xl font-extrabold text-blue-400 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-400" /> Verify Email Address
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                We've sent a 6-digit confirmation code. Enter it below to activate your account.
              </p>
              <label className="block rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">6-Digit Code</span>
                <input
                  required
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 123456"
                  className="mt-1 w-full bg-transparent text-lg font-bold text-white outline-none tracking-widest"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Complete Signup"}
              </button>
            </form>
          ) : (
            /* ── Registration Form ── */
            <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-4">
              {/* Full Name */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <User size={18} className="shrink-0 text-slate-300" />
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Full Name</span>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>
              </label>

              {/* Email Address */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <Mail size={18} className="shrink-0 text-slate-300" />
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Email Address</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                    placeholder="e.g. name@agency.gov"
                  />
                </div>
              </label>

              {/* Phone Number */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <Phone size={18} className="shrink-0 text-slate-300" />
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Phone Number</span>
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                    placeholder="e.g. +14155550198"
                  />
                </div>
              </label>

              {/* Password */}
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
                    placeholder="Min 6 characters"
                  />
                </div>
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-slate-400 cursor-pointer">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              {/* Confirm Password */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
                <Lock size={18} className="shrink-0 text-slate-300" />
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Confirm Password</span>
                  <input
                    required
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                    placeholder="Re-enter password"
                  />
                </div>
                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="text-slate-400 cursor-pointer">
                  {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                {loading ? "Registering..." : "Create Account"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="font-bold text-blue-300 underline">
              Sign in here
            </Link>
          </p>

          {/* Info Box */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/10 p-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-amber-300" />
              <b>Responder Security</b>
            </div>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Registered responder credentials encrypt offline search data in compliance with agency incident reporting regulations.
            </p>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
