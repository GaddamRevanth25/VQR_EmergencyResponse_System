import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCw, AlertCircle, Zap, Camera, Settings, ScanLine, Image } from "lucide-react";
import { PhoneShell } from "../PhoneShell";

export function ScanScreen() {
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [confidence, setConfidence] = useState(0);
  const [recognized, setRecognized] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Automatically reload the page when camera permission status is updated by the user
  useEffect(() => {
    let permissionStatus: PermissionStatus | null = null;

    const handlePermissionChange = () => {
      window.location.reload();
    };

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((status) => {
          permissionStatus = status;
          status.addEventListener("change", handlePermissionChange);
        })
        .catch((err) => {
          console.warn("Permissions API not supported for camera:", err);
        });
    }

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener("change", handlePermissionChange);
      }
    };
  }, []);

  // Toggle camera flash (torch) if supported by the browser stream
  useEffect(() => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      const capabilities = videoTrack.getCapabilities?.();
      // @ts-ignore - torch is not in standard ts MediaTrackCapabilities
      if (capabilities && capabilities.torch) {
        videoTrack.applyConstraints({
          advanced: [{
            // @ts-ignore
            torch: isFlashOn
          }]
        }).catch((err) => {
          console.warn("Failed to toggle camera hardware flash:", err);
        });
      }
    }
  }, [isFlashOn, stream]);

  // Handle local media (image) uploads
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsScanning(true);
      setConfidence(0);
      setRecognized(false);

      // Simulate recognition progress quickly for uploaded file
      let currentConfidence = 0;
      const interval = setInterval(() => {
        currentConfidence += Math.random() * 18 + 12;
        if (currentConfidence >= 98) {
          currentConfidence = 98;
          setConfidence(98);
          setRecognized(true);
          setIsScanning(false);
          clearInterval(interval);
        } else {
          setConfidence(currentConfidence);
        }
      }, 150);
    }
  };

  // Re-request camera permissions
  const requestCameraPermission = async () => {
    setShowSettingsModal(false);
    setErrorMsg(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((err) => {
          console.warn("Auto-play blocked:", err);
        });
      }
    } catch (err: any) {
      console.warn("Manual camera access request denied:", err);
      setErrorMsg(err?.message || "Permission Denied");
    }
  };

  // Simulate confidence scanning animation
  useEffect(() => {
    if (!isScanning) return;
    setConfidence(0);
    setRecognized(false);
    const interval = setInterval(() => {
      setConfidence((prev) => {
        if (prev >= 98) {
          clearInterval(interval);
          setRecognized(true);
          return 98;
        }
        return prev + Math.random() * 8 + 2;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [isScanning]);

  // Toggle front and rear cameras
  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  return (
    <PhoneShell title="CAMERA SCAN">
      <div className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white flex flex-col">
        {/* Inline keyframe styles for scan animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes scanLineMove {
            0%, 100% { top: 20%; }
            50% { top: 75%; }
          }
          @keyframes scanPulse {
            0%, 100% { opacity: 0.4; box-shadow: 0 0 8px #22d3ee, 0 0 20px rgba(34,211,238,0.15); }
            50% { opacity: 1; box-shadow: 0 0 20px #22d3ee, 0 0 50px rgba(34,211,238,0.3); }
          }
          @keyframes cornerGlow {
            0%, 100% { filter: drop-shadow(0 0 6px rgba(34,211,238,0.6)); }
            50% { filter: drop-shadow(0 0 14px rgba(34,211,238,1)); }
          }
          @keyframes waveform {
            0% { transform: scaleY(0.3); }
            25% { transform: scaleY(1.0); }
            50% { transform: scaleY(0.5); }
            75% { transform: scaleY(0.8); }
            100% { transform: scaleY(0.3); }
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes progressFill {
            from { width: 0%; }
          }
          .scan-line-anim {
            animation: scanLineMove 3.5s ease-in-out infinite;
          }
          .scan-pulse {
            animation: scanPulse 2s ease-in-out infinite;
          }
          .corner-glow {
            animation: cornerGlow 2s ease-in-out infinite;
          }
          .waveform-bar {
            animation: waveform 0.8s ease-in-out infinite;
          }
          .fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
          }
        `}} />

        {/* Shading overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/80 z-10 pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-3 z-20">
          <Link to="/app" className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition">
            <ArrowLeft className="text-cyan-400" size={18} />
          </Link>
          <div className="flex items-center gap-2 text-slate-300">
            <Camera size={18} className="text-cyan-400" />
            <span className="text-xs font-bold tracking-widest uppercase">Scanner</span>
          </div>
          <button
            onClick={toggleCamera}
            className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
            title="Switch Front/Rear Camera"
          >
            <RotateCw size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Confidence Score Badge (appears after some scanning) */}
        {confidence > 15 && (
          <div className="relative z-20 mx-auto mb-2 fade-in-up">
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl px-4 py-2.5 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                  {Math.min(Math.round(confidence), 98)}% / {recognized ? "HIGH CONFIDENCE" : "ANALYZING..."}
                </span>
                {recognized && (
                  <span className="size-4 rounded-full bg-cyan-500 grid place-items-center text-[8px] text-slate-950 font-black">✓</span>
                )}
              </div>
              {/* Progress Bar */}
              <div className="h-1.5 w-44 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(confidence, 98)}%` }}
                />
              </div>
              {recognized && (
                <div className="mt-1.5 text-[10px] text-slate-400">
                  <b className="text-cyan-300">VEHICLE RECOGNIZED</b> · Front Grille Detected
                </div>
              )}
            </div>
          </div>
        )}

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

        {/* === Scan Framing Box with Glowing Neon Corners === */}
        <div className="relative mx-8 my-auto aspect-[4/3] z-20 pointer-events-none">
          {/* Corner brackets — glowing cyan like scan_demo */}
          {/* Top-left */}
          <span className="absolute -left-1 -top-1 w-10 h-10 border-l-[3px] border-t-[3px] border-cyan-400 rounded-tl-lg corner-glow" />
          {/* Top-right */}
          <span className="absolute -right-1 -top-1 w-10 h-10 border-r-[3px] border-t-[3px] border-cyan-400 rounded-tr-lg corner-glow" />
          {/* Bottom-left */}
          <span className="absolute -bottom-1 -left-1 w-10 h-10 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-lg corner-glow" />
          {/* Bottom-right */}
          <span className="absolute -bottom-1 -right-1 w-10 h-10 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-lg corner-glow" />

          {/* Subtle dotted border connecting corners */}
          <div className="absolute inset-3 border border-dashed border-cyan-500/20 rounded-lg" />

          {/* Animated horizontal scan line */}
          {isScanning && (
            <div className="absolute left-0 right-0 h-[2px] scan-line-anim" style={{ zIndex: 30 }}>
              <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-pulse rounded-full" />
              {/* Waveform bars on the scan line */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-3 flex items-end gap-[2px] h-6">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-[2px] bg-cyan-400/60 rounded-full waveform-bar"
                    style={{
                      height: `${Math.random() * 16 + 4}px`,
                      animationDelay: `${i * 0.05}s`,
                      animationDuration: `${0.5 + Math.random() * 0.6}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls Panel */}
        <div className="relative mt-auto p-5 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          {/* Toolbar icons row */}
          <div className="flex items-center justify-center gap-5 mb-4 text-slate-500">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-cyan-400 transition cursor-pointer"
              title="Upload Media from Device"
            >
              <Image size={16} />
            </button>
            <button
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={`transition cursor-pointer ${isFlashOn ? 'text-yellow-400 hover:text-yellow-300' : 'hover:text-cyan-400'}`}
              title={isFlashOn ? "Turn Flash Off" : "Turn Flash On"}
            >
              <Zap size={16} fill={isFlashOn ? "white" : "none"} className={isFlashOn ? "text-yellow-400" : ""} />
            </button>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="hover:text-cyan-400 transition cursor-pointer"
              title="Camera Permissions Settings"
            >
              <Settings size={16} />
            </button>
          </div>

          {recognized ? (
            <div className="bg-slate-900/85 border border-cyan-500/30 backdrop-blur-xl rounded-2xl p-4 mb-4 fade-in-up shadow-xl shadow-cyan-500/5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">Vehicle Recognized</span>
                  <h3 className="text-lg font-bold text-white tracking-wide">Audi A4 (2023)</h3>
                </div>
                <div className="bg-cyan-500/10 text-cyan-400 rounded-xl p-2.5 border border-cyan-500/20">
                  <ScanLine size={20} className="animate-pulse" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setConfidence(0);
                    setRecognized(false);
                    setIsScanning(true);
                  }}
                  className="flex-1 rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs font-bold tracking-wider text-slate-300 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                >
                  SCAN AGAIN
                </button>
                <Link
                  to="/results"
                  className="flex-1 text-center rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold tracking-wider text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95 transition flex items-center justify-center gap-1.5"
                >
                  VIEW DETAILS
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => setIsScanning(!isScanning)}
                className="rounded-xl bg-slate-800 border border-white/10 px-5 py-2.5 text-xs font-bold tracking-wider text-slate-300 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
              >
                {isScanning ? "STOP SCAN" : "START SCAN"}
              </button>
            </div>
          )}

          {/* Status bar */}
          <div className="mt-3 mx-auto max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center backdrop-blur">
            <p className="font-mono text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <span className={`size-1.5 rounded-full ${isScanning ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
              {errorMsg ? "SIMULATOR ACTIVE" : isScanning ? "LENS STREAM OK" : "SCANNER PAUSED"} · <b className="text-cyan-300">{Math.min(Math.round(confidence), 98)}% COMPATIBLE</b>
            </p>
          </div>
        </div>

        {/* Hidden input for local media upload */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Settings Modal (Camera Permissions Dialog) */}
        {showSettingsModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-6">
            <div className="w-full max-w-sm rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 shadow-2xl shadow-cyan-500/10 text-white fade-in-up">
              <div className="flex items-center gap-2.5 mb-3 border-b border-white/10 pb-3">
                <Settings className="text-cyan-400" size={20} />
                <h3 className="font-bold text-sm tracking-wide uppercase text-slate-100">Camera Permissions</h3>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed text-center">
                If camera access is blocked or not working, you can update permissions in your browser:
              </p>

              <div className="space-y-3 mb-5 text-left">
                <div className="flex gap-2.5 items-start">
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-cyan-500/10 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">1</span>
                  <p className="text-[11px] text-slate-300">
                    Tap the <b className="text-white">settings/lock icon</b> next to the URL in your browser's search bar.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-cyan-500/10 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">2</span>
                  <p className="text-[11px] text-slate-300">
                    Find the <b className="text-white">Camera</b> setting and toggle it to <b className="text-cyan-400">Allow</b>.
                  </p>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-cyan-500/10 text-[10px] font-bold text-cyan-400 border border-cyan-500/20">3</span>
                  <p className="text-[11px] text-slate-300">
                    The scanner page will reload automatically to start the feed.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={requestCameraPermission}
                  className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold tracking-wider text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-95 transition cursor-pointer"
                >
                  REQUEST PERMISSION NOW
                </button>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="w-full rounded-xl bg-slate-800 border border-white/10 py-2.5 text-xs font-bold tracking-wider text-slate-300 hover:bg-slate-700 active:scale-95 transition cursor-pointer"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
