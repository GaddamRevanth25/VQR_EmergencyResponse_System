import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Eye, EyeOff, ShieldAlert, KeyRound, Mail, Phone, User } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";

export function RegisterScreen({ onRegisterSuccess }: { onRegisterSuccess: () => void }) {
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john.doe@station4.gov");
  const [phone, setPhone] = useState("+1 (555) 881-2294");
  const [password, setPassword] = useState("••••••••");
  const [confirmPassword, setConfirmPassword] = useState("••••••••");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  return (
    <PhoneShell title="RESPONDER REGISTER">
      <div className="min-h-[720px] bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 p-5 text-white">
        <div className="max-w-md mx-auto">
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

        {/* Inputs */}
        <div className="mt-6 space-y-4">
          {/* Full Name */}
          <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <User size={18} className="shrink-0 text-slate-300" />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Full Name</span>
              <input
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
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                placeholder="e.g. +1 (555) 000-0000"
              />
            </div>
          </label>

          {/* Password */}
          <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <Lock size={18} className="shrink-0 text-slate-300" />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Password</span>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                placeholder="4-8 characters"
              />
            </div>
            <button onClick={() => setShowPass(!showPass)} className="text-slate-400 cursor-pointer">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          {/* Confirm Password */}
          <label className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <Lock size={18} className="shrink-0 text-slate-300" />
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">Confirm Password</span>
              <input
                type={showConfirmPass ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full bg-transparent font-bold text-white outline-none"
                placeholder="Re-enter password"
              />
            </div>
            <button onClick={() => setShowConfirmPass(!showConfirmPass)} className="text-slate-400 cursor-pointer">
              {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={onRegisterSuccess}
          className="mt-6 w-full rounded-2xl bg-blue-600 py-4 font-extrabold text-white shadow-xl shadow-blue-600/25 active:scale-[0.98] cursor-pointer"
        >
          Create account & sign in
        </button>

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
