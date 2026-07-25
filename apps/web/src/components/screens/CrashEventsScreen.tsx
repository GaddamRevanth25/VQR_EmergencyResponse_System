import { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Phone,
  Activity,
  Filter,
  ExternalLink,
  ShieldAlert,
  Clock,
} from "lucide-react";
import { PhoneShell } from "../PhoneShell";
import { Badge } from "../Badge";

interface CrashEvent {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  latitude?: number;
  longitude?: number;
  speedEstimate?: number;
  confidenceScore: number;
  status: "ACTIVE" | "RESOLVED" | "FALSE_ALARM";
  createdAt?: string;
  resolvedAt?: string;
  sensorFeatures?: number[];
}

export function CrashEventsScreen() {
  const [events, setEvents] = useState<CrashEvent[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED" | "FALSE_ALARM">("ALL");
  const [sseConnected, setSseConnected] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CrashEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial list of crash events
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      // Fetch from API (uses mock fallback if unauthenticated for preview)
      const res = await fetch("/api/v1/sos/events?limit=50");
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      } else {
        // Fallback demo data for immediate visual verification
        setEvents(getDemoEvents());
      }
    } catch {
      setEvents(getDemoEvents());
    } finally {
      setIsLoading(false);
    }
  };

  // SSE Stream Listener for real-time live updates
  useEffect(() => {
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource("/api/v1/sos/events/stream");

      eventSource.onopen = () => {
        setSseConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "crash_event") {
            setEvents((prev) => {
              const exists = prev.some((e) => e.id === data.id);
              if (exists) {
                return prev.map((e) => (e.id === data.id ? { ...e, ...data } : e));
              }
              return [data, ...prev];
            });
          }
        } catch (e) {
          console.error("SSE parse error", e);
        }
      };

      eventSource.onerror = () => {
        setSseConnected(false);
      };
    } catch (e) {
      setSseConnected(false);
    }

    return () => {
      eventSource?.close();
    };
  }, []);

  const handleResolve = async (eventId: string, newStatus: "RESOLVED" | "FALSE_ALARM") => {
    try {
      await fetch(`/api/v1/sos/${eventId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Local optimistic update
    }

    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, status: newStatus, resolvedAt: new Date().toISOString() }
          : e
      )
    );

    if (selectedEvent?.id === eventId) {
      setSelectedEvent((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    return e.status === filter;
  });

  const activeCount = events.filter((e) => e.status === "ACTIVE").length;
  const resolvedCount = events.filter((e) => e.status === "RESOLVED").length;
  const avgConfidence = events.length
    ? (events.reduce((acc, e) => acc + e.confidenceScore, 0) / events.length) * 100
    : 0;

  return (
    <PhoneShell title="VQR CRASH MONITORING DASHBOARD">
      <div className="relative min-h-[720px] bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 text-slate-900 dark:text-white transition-colors duration-500 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-500/25">
                <AlertTriangle size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-xs font-bold tracking-[0.22em] text-red-700 dark:text-red-400">VQR EMERGENCY</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      sseConnected
                        ? "bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-800"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        sseConnected ? "bg-green-500 animate-ping" : "bg-amber-500"
                      }`}
                    />
                    {sseConnected ? "LIVE STREAM" : "POLLING"}
                  </span>
                </div>
                <h1 className="text-xl font-extrabold leading-none">Vehicle Crash Events</h1>
              </div>
            </div>

            <button
              onClick={fetchEvents}
              className="grid size-9 place-items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="mt-5 grid grid-cols-3 gap-2.5">
            <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 p-3">
              <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                <span className="text-[10px] font-extrabold font-mono tracking-wider uppercase">Active Alerts</span>
                <ShieldAlert size={16} />
              </div>
              <p className="mt-1 text-2xl font-black text-red-700 dark:text-red-400">{activeCount}</p>
            </div>

            <div className="rounded-xl border border-green-200 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20 p-3">
              <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                <span className="text-[10px] font-extrabold font-mono tracking-wider uppercase">Resolved</span>
                <CheckCircle2 size={16} />
              </div>
              <p className="mt-1 text-2xl font-black text-green-700 dark:text-green-400">{resolvedCount}</p>
            </div>

            <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-3">
              <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
                <span className="text-[10px] font-extrabold font-mono tracking-wider uppercase">Avg Conf</span>
                <Activity size={16} />
              </div>
              <p className="mt-1 text-2xl font-black text-blue-700 dark:text-blue-400">{avgConfidence.toFixed(0)}%</p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter size={12} /> FILTER:
            </span>
            {(["ALL", "ACTIVE", "RESOLVED", "FALSE_ALARM"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold tracking-wider font-mono transition ${
                  filter === f
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Crash Events List */}
          <div className="mt-4 space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <CheckCircle2 size={36} className="mx-auto text-green-500 opacity-60" />
                <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No crash events matching filter
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Active crash detections will stream here in real time.
                </p>
              </div>
            ) : (
              filteredEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  className={`rounded-xl border p-4 transition cursor-pointer ${
                    ev.status === "ACTIVE"
                      ? "border-red-300 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 hover:border-red-400 shadow-sm shadow-red-500/10"
                      : ev.status === "RESOLVED"
                      ? "border-green-200 dark:border-green-900/40 bg-white dark:bg-slate-900/80 hover:border-green-300"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`size-2.5 rounded-full ${
                          ev.status === "ACTIVE"
                            ? "bg-red-600 animate-ping"
                            : ev.status === "RESOLVED"
                            ? "bg-green-500"
                            : "bg-slate-400"
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {ev.userName || "Anonymous Driver"}
                          </span>
                          <Badge
                            tone={
                              ev.status === "ACTIVE"
                                ? "red"
                                : ev.status === "RESOLVED"
                                ? "green"
                                : "slate"
                            }
                          >
                            {ev.status}
                          </Badge>
                        </div>

                        {ev.userPhone && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5 font-mono">
                            <Phone size={11} /> {ev.userPhone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-extrabold text-red-600 dark:text-red-400">
                        {(ev.confidenceScore * 100).toFixed(0)}% Conf
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center justify-end gap-1">
                        <Clock size={10} />
                        {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : "Just now"}
                      </p>
                    </div>
                  </div>

                  {/* GPS Coordinates & Actions */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    {ev.latitude != null && ev.longitude != null ? (
                      <a
                        href={`https://maps.google.com/maps?q=${ev.latitude},${ev.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <MapPin size={12} />
                        {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 font-mono">No GPS Data</span>
                    )}

                    {ev.status === "ACTIVE" && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleResolve(ev.id, "FALSE_ALARM")}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                        >
                          False Alarm
                        </button>
                        <button
                          onClick={() => handleResolve(ev.id, "RESOLVED")}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-green-600 text-white hover:bg-green-700 shadow-sm"
                        >
                          Resolve SOS
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Selected Event Detail Modal / Drawer */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <Badge tone={selectedEvent.status === "ACTIVE" ? "red" : "green"}>
                    {selectedEvent.status}
                  </Badge>
                  <h3 className="text-lg font-bold mt-1 text-slate-900 dark:text-white">
                    Crash Details — {selectedEvent.userName || "Driver"}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="py-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 font-mono">
                  <span className="text-slate-400">Event ID</span>
                  <span className="font-bold">{selectedEvent.id}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 font-mono">
                  <span className="text-slate-400">Model Confidence</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {(selectedEvent.confidenceScore * 100).toFixed(1)}%
                  </span>
                </div>

                {selectedEvent.speedEstimate != null && (
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 font-mono">
                    <span className="text-slate-400">Speed Estimate</span>
                    <span>{selectedEvent.speedEstimate.toFixed(1)} m/s</span>
                  </div>
                )}

                {selectedEvent.sensorFeatures && (
                  <div>
                    <span className="text-slate-400 font-mono block mb-1.5">ONNX 22-Feature Snapshot</span>
                    <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg font-mono text-[10px] max-h-24 overflow-y-auto break-all text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                      {JSON.stringify(selectedEvent.sensorFeatures)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Close
                </button>
                {selectedEvent.status === "ACTIVE" && (
                  <button
                    onClick={() => handleResolve(selectedEvent.id, "RESOLVED")}
                    className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-xs font-bold hover:bg-green-700"
                  >
                    Mark Resolved
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}

function getDemoEvents(): CrashEvent[] {
  return [
    {
      id: "ev-demo-101",
      userId: "usr-8891",
      userName: "Alex Rivers",
      userPhone: "+1 (555) 234-5678",
      latitude: 37.7749,
      longitude: -122.4194,
      speedEstimate: 24.5,
      confidenceScore: 0.94,
      status: "ACTIVE",
      createdAt: new Date(Date.now() - 120000).toISOString(),
      sensorFeatures: [
        0.12, -0.45, 9.81, 0.05, 0.08, 0.12, 18.4, 12.1, 24.6, -15.2, -8.4, -2.1,
        0.01, 0.02, -0.01, 0.15, 0.22, 0.18, 2.4, 3.1, 1.8, 24.6,
      ],
    },
    {
      id: "ev-demo-102",
      userId: "usr-4412",
      userName: "Jordan Smith",
      userPhone: "+1 (555) 876-5432",
      latitude: 34.0522,
      longitude: -118.2437,
      speedEstimate: 18.2,
      confidenceScore: 0.88,
      status: "RESOLVED",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      resolvedAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];
}
