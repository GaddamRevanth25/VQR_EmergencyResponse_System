import { useState } from "react";
import { UserRound, MapPin, SlidersHorizontal, Fingerprint, ShieldCheck } from "lucide-react";
import { Badge } from "../Badge";
import { savedTravels } from "../../lib/data";
import { apiClient } from "../../lib/api";

export function SavedProfilePanel() {
  const [isEnrolled, setIsEnrolled] = useState(() => !!localStorage.getItem("vqr_biometric_secret"));
  
  const [is2FaEnabled, setIs2FaEnabled] = useState(() => {
    const userInfoRaw = localStorage.getItem("vqr_user_info");
    if (userInfoRaw) {
      try {
        const info = JSON.parse(userInfoRaw);
        return !!info.twoFactorEnabled || !!info.two_factor_enabled;
      } catch (e) {}
    }
    return false;
  });

  const handleEnrollBiometrics = async () => {
    const userInfoRaw = localStorage.getItem("vqr_user_info");
    if (!userInfoRaw) {
      alert("Please log in first to enroll biometrics.");
      return;
    }
    try {
      const userInfo = JSON.parse(userInfoRaw);
      const email = userInfo.email;

      // Generate a cryptographically secure 32-character hex key
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      const secret = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

      // Register shared key with FastAPI backend
      await apiClient.registerBiometric({
        email: email,
        biometricPublicKey: secret,
      });

      localStorage.setItem("vqr_biometric_secret", secret);
      setIsEnrolled(true);
      alert("Device biometrics (Face / Fingerprint) enrolled successfully!");
    } catch (e: any) {
      alert("Biometric enrollment failed: " + (e.message || e));
    }
  };

  const handleResetBiometrics = () => {
    localStorage.removeItem("vqr_biometric_secret");
    setIsEnrolled(false);
    alert("Biometric login disabled on this device.");
  };

  const handleToggle2FA = async () => {
    const token = localStorage.getItem("vqr_access_token");
    const userInfoRaw = localStorage.getItem("vqr_user_info");
    if (!token || !userInfoRaw) {
      alert("Please sign in first to modify 2FA settings.");
      return;
    }
    try {
      const userInfo = JSON.parse(userInfoRaw);
      const nextVal = !is2FaEnabled;

      await apiClient.toggle2fa({ enabled: nextVal }, token);

      setIs2FaEnabled(nextVal);

      // Update local storage info
      userInfo.twoFactorEnabled = nextVal;
      userInfo.two_factor_enabled = nextVal;
      localStorage.setItem("vqr_user_info", JSON.stringify(userInfo));

      alert(`Two-Factor Authentication (2FA) has been ${nextVal ? "enabled" : "disabled"} successfully!`);
    } catch (e: any) {
      alert("Failed to toggle 2FA: " + (e.message || e));
    }
  };

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

      {/* 2FA Enrollment Card */}
      <div className="mt-5 rounded-3xl border bg-slate-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid size-11 place-items-center rounded-2xl bg-indigo-100 text-indigo-700">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Two-Factor Authentication (2FA)</h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Require a 6-digit OTP code or registered biometric passkey to log in.</p>
          </div>
        </div>
        <button
          onClick={handleToggle2FA}
          className={`w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-md ${
            is2FaEnabled
              ? "bg-red-600 text-white hover:bg-red-700 shadow-red-500/15"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/15"
          }`}
        >
          {is2FaEnabled ? "Disable 2FA" : "Enable 2FA"}
        </button>
      </div>

      {/* Biometric Enrollment Card */}
      <div className="mt-4 rounded-3xl border bg-slate-50 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid size-11 place-items-center rounded-2xl bg-blue-100 text-blue-700">
            <Fingerprint size={24} />
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">Biometric Credentials (Face / Touch ID)</h4>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Register a secure biometric shared key for instant logging.</p>
          </div>
        </div>
        {isEnrolled ? (
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-green-600 font-bold flex items-center gap-1">
              ● Enrolled
            </span>
            <button
              onClick={handleResetBiometrics}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition cursor-pointer"
            >
              Disable
            </button>
          </div>
        ) : (
          <button
            onClick={handleEnrollBiometrics}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer shadow-md shadow-blue-500/15"
          >
            Enroll Device Biometrics
          </button>
        )}
      </div>
    </div>
  );
}
