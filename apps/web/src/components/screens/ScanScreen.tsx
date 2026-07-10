import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCw, Zap, Camera, ScanLine, Image } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { apiClient } from "../../lib/api";

export function ScanScreen() {
  const navigate = useNavigate();
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [confidence, setConfidence] = useState(0);
  const [recognized, setRecognized] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  // Mock OCR choices
  const [countryType, setCountryType] = useState<"IN" | "UK" | "US">("IN");
  const [scannedRegText, setScannedRegText] = useState("");

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

  // Handle local media (image) uploads
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      triggerScanCycle();
    }
  };

  // Triggering the scanning simulation
  const triggerScanCycle = () => {
    setIsScanning(true);
    setConfidence(0);
    setRecognized(false);

    let currentConfidence = 0;
    const interval = setInterval(() => {
      currentConfidence += Math.random() * 15 + 10;
      if (currentConfidence >= 100) {
        setConfidence(100);
        setRecognized(true);
        setIsScanning(false);
        clearInterval(interval);

        // Assign a mock OCR reading based on selected country
        if (countryType === "IN") {
          setScannedRegText("MH02CL0555");
        } else if (countryType === "UK") {
          setScannedRegText("TE57VRN");
        } else {
          setScannedRegText("7XER187");
        }
      } else {
        setConfidence(currentConfidence);
      }
    }, 150);
  };

  // Automatically start scan on component mount or reset
  useEffect(() => {
    triggerScanCycle();
  }, [countryType]);

  // Handle viewing the matched results from simulated OCR lookup
  const handleViewDetails = async () => {
    try {
      const response = await apiClient.lookupVehicle(scannedRegText, countryType);
      
      // Save to localStorage preferences
      const saved = localStorage.getItem("vqr_recent_searches");
      let recent = [];
      if (saved) {
        try { recent = JSON.parse(saved); } catch (e) {}
      }
      const searchItem = {
        id: response.vehicleId,
        title: `${response.make} ${response.model} (${response.year})`,
        type: "scan",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        params: { reg: response.registrationNumber }
      };
      const updated = [searchItem, ...recent.filter((s: any) => s.id !== response.vehicleId)].slice(0, 10);
      localStorage.setItem("vqr_recent_searches", JSON.stringify(updated));

      navigate(`/results/${response.vehicleId}`);
    } catch (err) {
      alert("Plate registered but details not found in Mock passenger DB.");
    }
  };

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  return (
    <PhoneShell title="LICENSE PLATE SCANNER">
      <div className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white flex flex-col">
        {/* Inline keyframe styles for scan animations */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes scanLineMove {
            0%, 100% { top: 20%; }
            50% { top: 75%; }
          }
          @keyframes scanPulse {
            0%, 100% { opacity: 0.4; box-shadow: 0 0 8px #06b6d4, 0 0 20px rgba(6,182,212,0.15); }
            50% { opacity: 1; box-shadow: 0 0 20px #06b6d4, 0 0 50px rgba(6,182,212,0.3); }
          }
          .scan-line-anim {
            animation: scanLineMove 3.0s ease-in-out infinite;
          }
          .scan-pulse {
            animation: scanPulse 1.8s ease-in-out infinite;
          }
          .fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
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
            <ScanLine size={18} className="text-cyan-400" />
            <span className="text-xs font-bold tracking-widest uppercase">Plate Scanner</span>
          </div>
          <button
            onClick={toggleCamera}
            className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
          >
            <RotateCw size={18} className="text-slate-400" />
          </button>
        </div>

        {/* OCR Simulation Config - Country switch */}
        <div className="relative z-20 flex justify-center gap-2 px-5 mb-2">
          <span className="text-xs text-slate-400 self-center mr-2">Target Plate:</span>
          {(["IN", "UK", "US"] as const).map((cc) => (
            <button
              key={cc}
              onClick={() => setCountryType(cc)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                countryType === cc
                  ? "bg-cyan-500/25 border-cyan-400 text-cyan-300"
                  : "bg-slate-900/60 border-slate-800 text-slate-400"
              }`}
            >
              {cc}
            </button>
          ))}
        </div>

        {/* Confidence Progress */}
        {confidence > 5 && (
          <div className="relative z-20 mx-auto mb-2 fade-in-up">
            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-xl px-4 py-2 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-bold text-cyan-300 tracking-wider">
                  OCR: {Math.round(confidence)}% / {recognized ? "PLATE DETECTED" : "READING CHARACTERS..."}
                </span>
              </div>
              <div className="h-1 w-40 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-200"
                  style={{ width: `${confidence}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Camera Live Feed Viewport */}
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-slate-950">
          {errorMsg ? (
            <div className="px-6 text-center max-w-xs z-20">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-cyan-500/10 text-cyan-400 mb-3 animate-bounce">
                <Camera size={24} />
              </div>
              <p className="text-sm font-bold text-slate-200">Device camera feed active</p>
              <p className="text-xs text-slate-400 mt-1">({errorMsg})</p>
              <p className="text-xs text-slate-400 mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
                Simulating camera stream. Align template below.
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

        {/* === LICENSE PLATE FRAME GUIDE === */}
        <div className="relative mx-12 my-auto aspect-[3/1] z-20 pointer-events-none flex flex-col justify-center items-center">
          {/* Neon Corner Brackets */}
          <span className="absolute -left-1 -top-1 w-6 h-6 border-l-[3px] border-t-[3px] border-cyan-400 rounded-tl-md" />
          <span className="absolute -right-1 -top-1 w-6 h-6 border-r-[3px] border-t-[3px] border-cyan-400 rounded-tr-md" />
          <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-[3px] border-l-[3px] border-cyan-400 rounded-bl-md" />
          <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-[3px] border-r-[3px] border-cyan-400 rounded-br-md" />

          {/* Dotted helper line inside */}
          <div className="absolute inset-1.5 border border-dashed border-cyan-500/35 rounded-md" />

          {/* Simulated scanning horizontal laser line */}
          {isScanning && (
            <div className="absolute left-0 right-0 h-[2px] scan-line-anim">
              <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent scan-pulse" />
            </div>
          )}

          {/* Show OCR output bounding box */}
          {recognized && (
            <div className="bg-yellow-400/90 text-slate-950 px-4 py-1.5 font-mono font-black text-sm tracking-[0.2em] rounded border border-yellow-300 shadow-lg animate-pulse">
              {scannedRegText}
            </div>
          )}
        </div>

        {/* Bottom Controls Panel */}
        <div className="relative mt-auto p-5 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          {/* Gallery upload / manual trigger icons */}
          <div className="flex items-center justify-center gap-6 mb-4 text-slate-400">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-cyan-400 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <Image size={20} />
              <span className="text-[9px]">GALLERY</span>
            </button>
            <button
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={`transition cursor-pointer flex flex-col items-center gap-1 ${isFlashOn ? 'text-yellow-400' : 'hover:text-cyan-400'}`}
            >
              <Zap size={20} fill={isFlashOn ? "white" : "none"} />
              <span className="text-[9px]">FLASH</span>
            </button>
            <button
              onClick={() => triggerScanCycle()}
              className="hover:text-cyan-400 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <RotateCw size={20} />
              <span className="text-[9px]">RE-SCAN</span>
            </button>
          </div>

          {recognized ? (
            <div className="bg-slate-900/90 border border-cyan-500/35 backdrop-blur-xl rounded-2xl p-4 mb-4 fade-in-up shadow-xl text-center">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Plate Recognized ({countryType})</span>
              <h3 className="text-xl font-mono font-black text-white mt-1 tracking-widest">{scannedRegText}</h3>
              <p className="text-xs text-slate-400 mt-1">Successfully matched in passenger database</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => triggerScanCycle()}
                  className="flex-1 rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition"
                >
                  SCAN AGAIN
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition"
                >
                  VIEW SAFETY GUIDE
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={() => {
                  setConfidence(100);
                  setRecognized(true);
                  setIsScanning(false);
                  if (countryType === "IN") setScannedRegText("MH02CL0555");
                  else if (countryType === "UK") setScannedRegText("TE57VRN");
                  else setScannedRegText("7XER187");
                }}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-3 tracking-widest active:scale-95 transition"
              >
                MANUAL CAPTURE
              </button>
            </div>
          )}

          {/* Status bar */}
          <div className="mt-3 mx-auto max-w-xs rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-center backdrop-blur">
            <p className="font-mono text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <span className={`size-1.5 rounded-full ${isScanning ? "bg-green-500 animate-pulse" : "bg-slate-600"}`} />
              ALIGN LICENSE PLATE WITHIN NEON CORNERS
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
      </div>
    </PhoneShell>
  );
}
