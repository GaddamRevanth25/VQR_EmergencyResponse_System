import { useState, useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { 
  ArrowLeft, Play, ShieldAlert, Hammer, Flame,
  DoorClosed, Info, CheckCircle, AlertTriangle, 
  MapPin, Compass, Video 
} from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";
import { apiClient } from "../../lib/api";
import type { Vehicle } from "@vqr/shared";

// Safe fallback vehicle data if API lookup fails
const FALLBACK_VEHICLE: Vehicle = {
  id: "toyota-camry-2024",
  vehicleType: "CAR",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  fuelType: "HYBRID",
  safetyFeatures: [
    { title: "Emergency Glass Hammer", description: "Located in driver's door pocket. Strike corners of side windows, not center.", location: "Driver door pocket", icon: "hammer", priority: "high" },
    { title: "Emergency Trunk Release", description: "Glow-in-the-dark handle inside trunk. Pull to escape if locked in.", location: "Trunk interior, left side", icon: "exit", priority: "critical" }
  ],
  emergencyProcedures: [
    {
      scenario: "Vehicle Submersion",
      dos: [
        "Unbuckle immediately",
        "Open window before water rises",
        "Escape through window",
        "Leave belongings"
      ],
      donts: [
        "Wait for water to fill",
        "Try to open door against water pressure",
        "Call 112 before escaping"
      ],
      videoTimestamp: "45"
    },
    {
      scenario: "Engine Fire",
      dos: [
        "Pull over safely",
        "Turn off engine",
        "Evacuate all passengers",
        "Use extinguisher from 6 feet away"
      ],
      donts: [
        "Open hood fully",
        "Use water on electrical fire",
        "Stand directly in front"
      ],
      videoTimestamp: "10"
    }
  ],
  vehicleFeatures: [
    {
      category: "Fuel & Charging",
      items: [
        { name: "Fuel Cap", location: "Left rear fender", icon: "fuel" },
        { name: "12V Battery", location: "Engine bay, right side", icon: "battery" }
      ]
    },
    {
      category: "Tires & Tools",
      items: [
        { name: "Spare Tire", location: "Under trunk floor", icon: "tire" },
        { name: "Jack", location: "Trunk left compartment", icon: "jack" }
      ]
    }
  ],
  videoUrl: "/videos/toyota-camry-2024-traveler-safety.mp4",
  thumbnailUrl: "/videos/thumbnails/toyota-camry-2024.jpg"
};

export function ResultsScreen() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(FALLBACK_VEHICLE);
  const [activeTab, setActiveTab] = useState<"safety" | "guides" | "features" | "video">("safety");
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    async function loadVehicle() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const regParam = queryParams.get("reg");
        if (regParam) {
          const data = await apiClient.lookupRegistration(regParam);
          setVehicle(data);
        } else {
          const vehicleId = id || "toyota-camry-2024";
          const data = await apiClient.getVehicle(vehicleId);
          setVehicle(data);
        }
      } catch (err) {
        console.warn("Failed to load vehicle, defaulting to Camry simulation:", err);
        setVehicle(FALLBACK_VEHICLE);
      } finally {
        setLoading(false);
      }
    }
    loadVehicle();
  }, [id]);

  const playChapter = (timestampSeconds: string) => {
    setPlayingVideo(true);
    setTimeout(() => {
      if (videoRef.current) {
        const seconds = parseInt(timestampSeconds, 10) || 0;
        videoRef.current.currentTime = seconds;
        videoRef.current.play().catch((err) => {
          console.warn("Failed to auto-play chapter seek:", err);
        });
      }
    }, 200);
  };

  // Helper to resolve icon from string
  const renderIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case "hammer":
        return <Hammer className="size-6 text-orange-500" />;
      case "flame":
        return <Flame className="size-6 text-red-500" />;
      case "exit":
      case "doorclosed":
        return <DoorClosed className="size-6 text-green-500" />;
      case "shieldalert":
        return <ShieldAlert className="size-6 text-blue-500" />;
      default:
        return <Info className="size-6 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <PhoneShell title="LOADING VEHICLE GUIDE">
        <div className="min-h-[720px] bg-slate-900 text-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="size-10 rounded-full border-4 border-cyan-400 border-t-transparent animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Loading safety guide...</p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell title="VEHICLE SAFETY GUIDE">
      <div className="relative min-h-[720px] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-500 flex flex-col">
        {/* Results Header */}
        <div className="bg-slate-950 p-6 text-white border-b border-white/5 rounded-b-[2rem] shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/app" className="grid size-10 place-items-center rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition">
              <ArrowLeft className="text-white" size={16} />
            </Link>
            <p className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-black">VEHICLE PROFILE</p>
          </div>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black leading-tight tracking-tight">{vehicle.make} {vehicle.model}</h2>
              <p className="text-xs text-slate-400 font-bold mt-1">{vehicle.year} Model Year</p>
              {vehicle.registrationNumber && (
                <div className="inline-block bg-cyan-950/40 border border-cyan-800/30 rounded-lg px-2.5 py-1 mt-2.5">
                  <p className="text-[11px] text-cyan-400 font-mono font-bold tracking-wider">REG: {vehicle.registrationNumber}</p>
                </div>
              )}
              {vehicle.ownerName && (
                <p className="text-xs text-slate-300 mt-2 font-medium">Owner: {vehicle.ownerName}</p>
              )}
            </div>
            <Badge tone="green">{vehicle.fuelType}</Badge>
          </div>
        </div>

        {/* Tab Selector Row */}
        <div className="flex border-b border-slate-200/60 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20">
          {[
            { id: "safety", label: "Safety Tools" },
            { id: "guides", label: "Emergency do's" },
            { id: "features", label: "Car Features" },
            { id: "video", label: "Video Guide" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-4 text-center text-xs font-black uppercase tracking-wider transition-all border-b-2 ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 dark:border-cyan-400 dark:text-cyan-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents Viewport */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6 pb-24">
          {/* TAB 1: SAFETY FEATURES */}
          {activeTab === "safety" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">Your Safety Equipment</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Location guide for passenger safety items in this vehicle.</p>
              </div>
              
              <div className="grid gap-6 sm:grid-cols-2">
                {vehicle.safetyFeatures.map((f: any, i: number) => (
                  <div 
                    key={i}
                    className="flex gap-5 p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/40 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-xl">
                      {renderIcon(f.icon)}
                    </div>
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-base text-slate-800 dark:text-slate-100">{f.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.description}</p>
                      <div className="inline-block bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg mt-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider font-semibold">📍 Location: {f.location}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: EMERGENCY GUIDES */}
          {activeTab === "guides" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">“What do I do if...”</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Critical step-by-step passenger emergency guides.</p>
              </div>

              {vehicle.emergencyProcedures.map((guide: any, idx: number) => (
                <div 
                  key={idx}
                  className="rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/40 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <div className="bg-slate-100/70 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-200/80 dark:border-white/5 flex items-center gap-2">
                    <Compass className="text-cyan-500 size-5" />
                    <h4 className="font-black text-base text-slate-800 dark:text-slate-100">{guide.scenario}</h4>
                  </div>
                  <div className="p-6 grid gap-6 sm:grid-cols-2">
                    {/* Do's List */}
                    <div className="space-y-3 p-4 rounded-2xl bg-green-500/5 border border-green-500/10">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-green-600 dark:text-green-400 tracking-wider">
                        <CheckCircle size={15} />
                        <span>What to Do</span>
                      </div>
                      <ul className="space-y-2">
                        {guide.dos.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                            <span className="text-green-500 font-bold select-none">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Don'ts List */}
                    <div className="space-y-3 p-4 rounded-2xl bg-red-500/5 border border-red-500/10">
                      <div className="flex items-center gap-2 text-xs font-black uppercase text-red-600 dark:text-red-400 tracking-wider">
                        <AlertTriangle size={15} />
                        <span>What NOT to Do</span>
                      </div>
                      <ul className="space-y-2">
                        {guide.donts.map((item: string, i: number) => (
                          <li key={i} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-start gap-2">
                            <span className="text-red-500 font-bold select-none">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: VEHICLE FEATURES */}
          {activeTab === "features" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">Everyday Vehicle Features</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Location map and guides for ports, fuel caps, and changing tires.</p>
              </div>

              {vehicle.vehicleFeatures.map((group: any, idx: number) => (
                <div key={idx} className="space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-white/5 pb-2">
                    {group.category}
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {group.items.map((item: any, i: number) => (
                      <div 
                        key={i}
                        className="flex items-start gap-4 p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/40 shadow-sm"
                      >
                        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-cyan-400 text-lg">
                          <MapPin size={18} />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">{item.name}</h5>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed font-semibold">📍 {item.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: VIDEO BRIEFING GUIDE */}
          {activeTab === "video" && (
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <h3 className="text-xl font-black tracking-tight text-slate-800 dark:text-slate-100">Safety Video Briefing</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Visual walkthrough of safety exits, tools and emergency procedures.</p>
              </div>

              <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl border border-white/5">
                {playingVideo ? (
                  <video 
                    ref={videoRef}
                    src={vehicle.videoUrl} 
                    controls 
                    autoPlay 
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-blue-950 flex flex-col items-center justify-center p-6 border-b border-white/5">
                    <button 
                      onClick={() => setPlayingVideo(true)}
                      className="grid size-20 place-items-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 active:scale-95 transition cursor-pointer mb-4"
                    >
                      <Play className="size-10 text-cyan-400" fill="currentColor" />
                    </button>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300">Play Demonstration</span>
                  </div>
                )}
                
                <div className="p-5 bg-slate-900">
                  <span className="text-[10px] font-mono font-black tracking-wider text-cyan-400 uppercase block mb-4">
                    Video chapters (Click to seek)
                  </span>
                  <div className="space-y-2">
                    {vehicle.emergencyProcedures
                      .filter((proc: any) => proc.videoTimestamp)
                      .map((proc: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => playChapter(proc.videoTimestamp!)}
                          className="w-full flex items-center justify-between p-3 rounded-2xl text-left bg-slate-950/60 border border-white/5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                        >
                          <span className="flex items-center gap-2 font-semibold">
                            <Video size={12} className="text-cyan-400" />
                            {proc.scenario} Guide
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {parseInt(proc.videoTimestamp!) >= 60
                              ? `${Math.floor(parseInt(proc.videoTimestamp!) / 60)}:${(parseInt(proc.videoTimestamp!) % 60).toString().padStart(2, '0')}`
                              : `0:${proc.videoTimestamp!.padStart(2, '0')}`}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Premium Bottom Bar */}
        <div className="sticky bottom-0 inset-x-0 bg-slate-50/80 dark:bg-slate-950/85 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 p-5 mt-auto z-20">
          <Link
            to="/app"
            className="w-full rounded-3xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 py-4 font-black text-xs uppercase tracking-wider text-center block shadow-lg hover:shadow-xl transition-all duration-300 active:scale-[0.98]"
          >
            Start New Search
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
