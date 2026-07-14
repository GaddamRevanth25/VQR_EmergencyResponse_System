import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, RotateCw, Zap, Camera, ScanLine, Image, ShieldCheck } from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { apiClient } from "../../lib/api";

export function ScanScreen() {
  const navigate = useNavigate();
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [recognized, setRecognized] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);

  // Mock OCR choices
  const [countryType, setCountryType] = useState<"IN" | "UK" | "US">("IN");
  const [scannedRegText, setScannedRegText] = useState("");
  const [scannedVehicle, setScannedVehicle] = useState<any>(null);

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
      performRealScan(file);
    }
  };

  // Perform a real scan using the backend API
  const performRealScan = async (fileBlob: Blob) => {
    setIsScanning(true);
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");
    setScannedVehicle(null);
    setErrorMsg(null);

    // Run progress bar animation simulation up to 85%
    let currentConfidence = 0;
    const progressInterval = setInterval(() => {
      currentConfidence += Math.random() * 15 + 5;
      if (currentConfidence >= 85) {
        setConfidence(85);
        clearInterval(progressInterval);
      } else {
        setConfidence(currentConfidence);
      }
    }, 100);

    try {
      const response = await apiClient.scanPlateImage(fileBlob);
      clearInterval(progressInterval);
      setConfidence(100);
      setIsScanning(false);

      if (response.prediction && response.prediction.predictedClass) {
        const plateText = response.prediction.predictedClass;
        setScannedRegText(plateText);
        setRecognized(true);
        if (response.success && response.vehicle) {
          setScannedVehicle(response.vehicle);
        } else {
          setScannedVehicle(null);
        }
      } else {
        setErrorMsg("Failed to read any characters from the plate.");
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsScanning(false);
      setErrorMsg("Failed to process scan: " + (err?.message || "OCR engine error"));
    }
  };

  const handleCaptureFrame = () => {
    if (videoRef.current && stream && stream.active) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            performRealScan(blob);
          }
        }, "image/jpeg", 0.95);
      }
    } else {
      setErrorMsg("Camera stream is currently inactive. Please check permissions or upload an image file using GALLERY.");
    }
  };

  // Triggering the scanning simulation
  const triggerScanCycle = () => {
    setIsScanning(true);
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");
    setScannedVehicle(null);

    let currentConfidence = 0;
    const interval = setInterval(() => {
      currentConfidence += Math.random() * 12 + 8;
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
    }, 200);
  };

  const resetScanner = () => {
    setIsScanning(false);
    setConfidence(0);
    setRecognized(false);
    setScannedRegText("");
    setScannedVehicle(null);
    setErrorMsg(null);
  };

  // Handle viewing the matched results from simulated OCR lookup
  const handleViewDetails = async () => {
    if (!scannedRegText) return;
    
    try {
      let vehicleId = scannedVehicle?.id;
      let regNumber = scannedRegText;
      let title = scannedVehicle ? `${scannedVehicle.make} ${scannedVehicle.model} (${scannedVehicle.year})` : `Recognized Plate ${scannedRegText}`;
      
      if (!vehicleId) {
        const response = await apiClient.lookupVehicle(scannedRegText, countryType);
        vehicleId = response.vehicleId;
        regNumber = response.registrationNumber;
        title = `${response.make} ${response.model} (${response.year})`;
      }

      // Save to localStorage preferences
      const saved = localStorage.getItem("vqr_recent_searches");
      let recent = [];
      if (saved) {
        try { recent = JSON.parse(saved); } catch (e) {}
      }
      const searchItem = {
        id: vehicleId,
        title: title,
        type: "scan",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        params: { reg: regNumber }
      };
      const updated = [searchItem, ...recent.filter((s: any) => s.id !== vehicleId)].slice(0, 10);
      localStorage.setItem("vqr_recent_searches", JSON.stringify(updated));

      navigate(`/results/${vehicleId}`);
    } catch (err) {
      alert("Plate recognized but details not found in database.");
    }
  };

  function toggleCamera() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  // Get active plate characters for bounding box highlight simulation
  const getSimulatedPlateText = () => {
    if (countryType === "IN") return "MH02CL0555";
    if (countryType === "UK") return "TE57VRN";
    return "7XER187";
  };

  const activePlateText = scannedRegText || getSimulatedPlateText();
  const highlightedCharCount = Math.floor((confidence / 100) * activePlateText.length);

  return (
    <PhoneShell title="COMPUTER VISION SCANNER">
      <div className="relative min-h-[720px] overflow-hidden bg-slate-950 text-white flex flex-col justify-between">
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes scanLineMove {
            0%, 100% { top: 0%; }
            50% { top: 100%; }
          }
          @keyframes borderGlow {
            0%, 100% { border-color: rgba(6, 182, 212, 0.4); }
            50% { border-color: rgba(6, 182, 212, 1); }
          }
          .scan-line-anim {
            animation: scanLineMove 2.5s ease-in-out infinite;
          }
          .glow-border {
            animation: borderGlow 1.5s ease-in-out infinite;
          }
          .fade-in-up {
            animation: fadeInUp 0.4s ease-out forwards;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />

        {/* Top Header Bar */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-3 z-30 bg-gradient-to-b from-slate-950 to-transparent">
          <Link to="/app" className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 transition">
            <ArrowLeft className="text-cyan-400" size={18} />
          </Link>
          <div className="flex items-center gap-2 text-slate-300">
            <ScanLine size={18} className="text-cyan-400" />
            <span className="text-xs font-bold tracking-widest uppercase font-mono">CV OCR Active</span>
          </div>
          <button
            onClick={toggleCamera}
            className="grid size-10 place-items-center rounded-xl bg-white/10 backdrop-blur-md border border-white/10 hover:bg-white/20 active:scale-95 transition cursor-pointer"
          >
            <RotateCw size={18} className="text-slate-400" />
          </button>
        </div>

        {/* OCR Simulation Config - Country switch */}
        <div className="relative z-30 flex justify-center gap-2 px-5 mb-2">
          <span className="text-xs text-slate-400 self-center mr-2">Target Format:</span>
          {(["IN", "UK", "US"] as const).map((cc) => (
            <button
              key={cc}
              onClick={() => setCountryType(cc)}
              className={`px-3 py-1 text-xs font-bold rounded-lg border transition ${
                countryType === cc
                  ? "bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.25)]"
                  : "bg-slate-900/60 border-slate-800 text-slate-400"
              }`}
            >
              {cc}
            </button>
          ))}
        </div>

        {/* Camera Live Feed Viewport */}
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-slate-950">
          {errorMsg ? (
            <div className="px-6 text-center max-w-xs z-10">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-cyan-500/10 text-cyan-400 mb-3 animate-bounce">
                <Camera size={24} />
              </div>
              <p className="text-sm font-bold text-slate-200">Device camera feed active</p>
              <p className="text-xs text-slate-400 mt-1">({errorMsg})</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover opacity-60"
            />
          )}
        </div>

        {/* === NEON LICENSE PLATE SCANNED FRAME ONLY === */}
        <div className="relative mx-10 my-auto aspect-[3.2/1] z-20 flex flex-col justify-center items-center rounded-xl border-2 border-cyan-500/40 glow-border bg-slate-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          
          {/* Surround Shading Panels (Darkening the remaining frames) */}
          <div className="absolute top-0 bottom-0 left-0 -ml-[100vw] w-[100vw] bg-slate-950/80 backdrop-blur-[2px]" />
          <div className="absolute top-0 bottom-0 right-0 -mr-[100vw] w-[100vw] bg-slate-950/80 backdrop-blur-[2px]" />
          <div className="absolute left-0 right-0 top-0 -mt-[100vh] h-[100vh] bg-slate-950/80 backdrop-blur-[2px]" />
          <div className="absolute left-0 right-0 bottom-0 -mb-[100vh] h-[100vh] bg-slate-950/80 backdrop-blur-[2px]" />

          {/* Neon Corner Brackets */}
          <span className="absolute -left-1.5 -top-1.5 w-6 h-6 border-l-[4px] border-t-[4px] border-cyan-400 rounded-tl-lg" />
          <span className="absolute -right-1.5 -top-1.5 w-6 h-6 border-r-[4px] border-t-[4px] border-cyan-400 rounded-tr-lg" />
          <span className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-[4px] border-l-[4px] border-cyan-400 rounded-bl-lg" />
          <span className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-[4px] border-r-[4px] border-cyan-400 rounded-br-lg" />

          {/* Computer Vision Character Bounding Boxes Overlay */}
          <div className="flex gap-1.5 px-3 py-2 bg-slate-900/90 rounded-lg border border-slate-700 select-none shadow-md">
            {activePlateText.split("").map((char, index) => {
              const isActive = index < highlightedCharCount;
              return (
                <span
                  key={index}
                  className={`w-6 h-8 flex items-center justify-center font-mono text-sm font-black rounded border transition-all duration-300 ${
                    recognized
                      ? "bg-cyan-500 border-cyan-400 text-slate-950 scale-105"
                      : isActive
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 scale-102"
                      : "bg-slate-950/60 border-slate-800 text-slate-600"
                  }`}
                >
                  {isActive || recognized ? char : "?"}
                </span>
              );
            })}
          </div>

          {/* Simulated scanning vertical laser line */}
          {isScanning && (
            <div className="absolute left-0 right-0 h-[2px] scan-line-anim pointer-events-none">
              <div className="h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            </div>
          )}
        </div>

        {/* Bottom Controls Panel */}
        <div className="relative mt-auto p-5 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          {/* Confidence Progress Bar */}
          {confidence > 0 && (
            <div className="max-w-[240px] mx-auto mb-4 bg-slate-900/90 border border-white/5 rounded-full px-3 py-1 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
                OCR Matcher
              </span>
              <span className="font-bold text-cyan-400">{Math.round(confidence)}%</span>
            </div>
          )}

          {recognized ? (
            <div className="bg-slate-900/95 border border-cyan-500/35 backdrop-blur-xl rounded-2xl p-4 mb-4 fade-in-up shadow-2xl text-center">
              <div className="mx-auto grid size-9 place-items-center rounded-full bg-cyan-500/10 text-cyan-400 mb-2">
                <ShieldCheck size={20} />
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">Plate Recognized</span>
              <h3 className="text-xl font-mono font-black text-white mt-1 tracking-widest">{scannedRegText}</h3>
              <p className="text-xs text-slate-400 mt-1">Successfully matched in passenger database</p>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={resetScanner}
                  className="flex-1 rounded-xl bg-slate-800 border border-white/10 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  RE-SCAN
                </button>
                <button
                  onClick={handleViewDetails}
                  className="flex-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/20 transition cursor-pointer"
                >
                  VIEW GUIDE
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 mb-4">
              <button
                onClick={handleCaptureFrame}
                className="rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-6 py-3.5 tracking-widest active:scale-95 transition cursor-pointer"
              >
                MANUAL CAPTURE
              </button>
            </div>
          )}

          {/* Gallery upload / flash icons */}
          <div className="flex items-center justify-center gap-6 mt-2 text-slate-400 border-t border-white/5 pt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="hover:text-cyan-400 transition cursor-pointer flex flex-col items-center gap-1"
            >
              <Image size={18} />
              <span className="text-[9px]">GALLERY</span>
            </button>
            <button
              onClick={() => setIsFlashOn(!isFlashOn)}
              className={`transition cursor-pointer flex flex-col items-center gap-1 ${isFlashOn ? 'text-yellow-400' : 'hover:text-cyan-400'}`}
            >
              <Zap size={18} fill={isFlashOn ? "white" : "none"} />
              <span className="text-[9px]">FLASH</span>
            </button>
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
