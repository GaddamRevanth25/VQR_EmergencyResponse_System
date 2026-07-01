import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileImage, Upload, RotateCw, AlertCircle } from "lucide-react";
import { PhoneShell } from "../PhoneShell";

export function ScanScreen() {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      setErrorMsg(null);
      
      // Stop any existing tracks before launching a new stream
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });

        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
            videoRef.current.play().catch((err) => {
              console.warn("Auto-play blocked:", err);
            });
          }
        }
      } catch (err: any) {
        console.warn("Camera access denied or unavailable:", err);
        if (active) {
          setErrorMsg(err?.message || "Permission Denied");
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Toggle front and rear cameras
  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  return (
    <PhoneShell title="CAMERA SCAN">
      <div className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white flex flex-col justify-between">
        {/* Shading layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/60 z-10 pointer-events-none" />

        {/* Scanner Header Controls */}
        <div className="relative flex items-center justify-between p-5 z-20">
          <Link to="/app" className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20 transition">
            <ArrowLeft className="text-white" size={18} />
          </Link>
          <div className="text-center">
            <p className="font-semibold text-sm">Align vehicle in frame</p>
            <p className="text-[10px] text-slate-400 capitalize">Mode: {facingMode} lens</p>
          </div>
          <button
            onClick={toggleCamera}
            className="grid size-10 place-items-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            title="Switch Front/Rear Camera"
          >
            <RotateCw size={18} className="text-blue-400" />
          </button>
        </div>

        {/* Camera Live Feed Viewport */}
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-slate-950">
          {errorMsg ? (
            <div className="px-6 text-center max-w-xs z-20">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-500/10 text-amber-400 mb-3 animate-bounce">
                <AlertCircle size={24} />
              </div>
              <p className="text-sm font-bold text-slate-200">Device camera unavailable</p>
              <p className="text-xs text-slate-400 mt-1">({errorMsg})</p>
              <p className="text-xs text-slate-400 mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                Simulated feed running. Upload a photo below or click the shutter to continue.
              </p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Floating Alignment Guidelines */}
        <div className="relative mx-8 my-auto aspect-[4/3] border-2 border-white/40 z-20 pointer-events-none rounded-xl">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-blue-500/60 shadow-[0_0_12px_#3b82f6]" />
          <span className="absolute -left-1 -top-1 size-8 border-l-4 border-t-4 border-blue-400" />
          <span className="absolute -right-1 -top-1 size-8 border-r-4 border-t-4 border-blue-400" />
          <span className="absolute -bottom-1 -left-1 size-8 border-b-4 border-l-4 border-blue-400" />
          <span className="absolute -bottom-1 -right-1 size-8 border-b-4 border-r-4 border-blue-400" />
        </div>

        {/* Diagnostics & Shutter Controls Panel */}
        <div className="relative p-6 z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="mx-auto max-w-xs rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center backdrop-blur mb-5">
            <p className="font-mono text-xs text-slate-300 flex items-center justify-center gap-2">
              <span className="size-2 rounded-full bg-green-500 animate-pulse" />
              {errorMsg ? "SIMULATOR ACTIVE" : "LENS STREAM OK"} · <b className="text-green-300">98% COMPATIBLE</b>
            </p>
          </div>

          <div className="flex items-center justify-around">
            <button className="grid size-12 place-items-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 active:scale-95 transition text-white/70 cursor-pointer">
              <FileImage size={18} />
            </button>
            
            <Link
              to="/results"
              className="size-[72px] rounded-full border-4 border-white bg-blue-600/20 hover:bg-blue-600/40 active:scale-90 transition block flex items-center justify-center shadow-xl shadow-blue-500/20"
              title="Capture Scan Frame"
            >
              <div className="size-12 rounded-full bg-white shadow-md active:scale-95 transition" />
            </Link>

            <button className="grid size-12 place-items-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/15 active:scale-95 transition text-white/70 cursor-pointer">
              <Upload size={18} />
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
