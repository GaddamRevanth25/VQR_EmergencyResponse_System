import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { createApiClient } from '@vqr/shared';
import {
  ShieldAlert,
  Search,
  Camera,
  Compass,
  AlertTriangle,
  Play,
  CheckCircle,
  ChevronRight,
  Info,
  Car,
  Layers
} from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';
const apiClient = createApiClient(API_BASE_URL);

// Standard navigation wrapper layout
function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0b0d] text-gray-100 flex flex-col antialiased">
      {/* Header navbar */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-purple-600 p-2 rounded-lg group-hover:bg-purple-500 transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)]">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white m-0 leading-none">VQR Rescue Hub</h1>
            <span className="text-xs text-purple-400 font-medium tracking-wide uppercase">Emergency Response</span>
          </div>
        </Link>

        <nav className="flex gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-gray-300 hover:text-white hover:underline decoration-purple-500 underline-offset-8 transition-all"
          >
            Dashboard
          </Link>
          <Link
            to="/vehicles"
            className="text-sm font-medium text-gray-300 hover:text-white hover:underline decoration-purple-500 underline-offset-8 transition-all"
          >
            Catalog
          </Link>
        </nav>
      </header>

      {/* Main container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-12 box-border">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-white/5 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} VQR Emergency Response System. Licensed for rescue responders in the field.
      </footer>
    </div>
  );
}

// Dashboard Page
function Dashboard() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanInput, setScanInput] = useState('toyota-camry-2024');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient
      .listVehicles()
      .then((data) => {
        setVehicles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSimulateScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    setScanning(true);
    setScanResult(null);

    try {
      // Simulate geolocation
      const mockCoords = {
        latitude: 37.7749,
        longitude: -122.4194,
        scannedBy: 'Station 4 Dispatcher'
      };

      const result = await apiClient.scanVehicle(scanInput, mockCoords);
      setScanResult(result);
    } catch (err: any) {
      console.error(err);
      setScanResult({
        success: false,
        message: 'Network error connecting to vehicle scan service'
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero Welcome banner */}
      <div className="rounded-2xl p-8 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-950/20 border border-purple-500/10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_50px_rgba(99,102,241,0.08)]">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold tracking-tight text-white m-0">Rescuer Field Terminal</h2>
          <p className="text-gray-400 max-w-xl text-sm leading-relaxed">
            Instantly identify vehicle make, battery positions, structural components, and high-voltage cutout zones using QR codes.
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            to="/vehicles"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)] flex items-center gap-2"
          >
            <Compass className="w-4 h-4" /> Explore Catalog
          </Link>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: QR Simulation */}
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Camera className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-bold text-white m-0">QR Code Scanner Simulator</h3>
            </div>

            <form onSubmit={handleSimulateScan} className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <select
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full glass-input rounded-xl px-4 py-3 text-sm appearance-none cursor-pointer pr-10"
                >
                  <option value="toyota-camry-2024">Toyota Camry 2024 (Hybrid)</option>
                  <option value="tesla-model-y-2023">Tesla Model Y 2023 (EV)</option>
                  <option value="ford-f150-lightning-2023">Ford F-150 Lightning 2023 (EV)</option>
                  <option value="hyundai-ioniq-5-2024">Hyundai Ioniq 5 2024 (EV)</option>
                  <option value="chevrolet-bolt-ev-2023">Chevrolet Bolt EV 2023 (EV)</option>
                  <option value="honda-crv-hybrid-2024">Honda CR-V Hybrid 2024 (Hybrid)</option>
                  <option value="unknown-id">Unknown/Unregistered QR Code</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </div>
              </div>
              <button
                type="submit"
                disabled={scanning}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(168,85,247,0.2)] flex justify-center items-center gap-2"
              >
                {scanning ? 'Initializing weights & analyzing...' : 'Simulate QR Scan'}
              </button>
            </form>

            {/* Scan outcome panel */}
            {scanResult && (
              <div className="rounded-xl border border-white/5 overflow-hidden animate-fadeIn">
                <div className={`p-4 flex items-center gap-3 ${scanResult.success ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-b border-red-500/20'}`}>
                  {scanResult.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
                  <span className="font-semibold text-sm">{scanResult.message}</span>
                </div>

                <div className="p-6 bg-slate-950/45 space-y-6">
                  {scanResult.prediction && (
                    <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/10 space-y-2">
                      <div className="flex justify-between text-xs text-indigo-400 font-semibold tracking-wider uppercase">
                        <span>ML Classification Node</span>
                        <span>Lazy Loaded Weights</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <span className="text-xs text-gray-500">Detected Class</span>
                          <p className="text-sm font-semibold text-gray-300 m-0">{scanResult.prediction.predictedClass}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Model Confidence</span>
                          <p className="text-sm font-semibold text-emerald-400 m-0">{(scanResult.prediction.confidence * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {scanResult.success && scanResult.vehicle ? (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-lg font-bold text-white m-0">
                          {scanResult.vehicle.year} {scanResult.vehicle.make} {scanResult.vehicle.model}
                        </h4>
                        <span className="text-xs text-gray-400">ID: {scanResult.vehicle.id}</span>
                      </div>
                      <button
                        onClick={() => navigate(`/vehicles/${scanResult.vehicle.id}`)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        Open Safety Guide <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-2">
                      Please register this QR tag inside the central repository database first.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Quick Catalog list */}
        <div className="space-y-8">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white m-0">Rescue Catalog Overview</h3>
            <div className="border-t border-white/5 pt-3 space-y-3">
              {loading ? (
                <div className="text-sm text-gray-400 py-4 text-center">Loading vehicle catalog...</div>
              ) : vehicles.length === 0 ? (
                <div className="text-sm text-gray-400 py-4 text-center">No vehicles loaded.</div>
              ) : (
                vehicles.map((v) => (
                  <Link
                    key={v.id}
                    to={`/vehicles/${v.id}`}
                    className="flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-purple-500/20 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Car className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
                      <div>
                        <p className="text-xs font-semibold text-gray-200 m-0">{v.make} {v.model}</p>
                        <span className="text-[10px] text-purple-400 font-medium">{v.year} model</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Vehicles Catalog Page
function VehiclesCatalog() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .listVehicles()
      .then((data) => {
        setVehicles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const filteredVehicles = vehicles.filter((v) => {
    const term = search.toLowerCase();
    return (
      v.make.toLowerCase().includes(term) ||
      v.model.toLowerCase().includes(term) ||
      v.id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header and search bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white m-0">Vehicle Rescue Directory</h2>
          <p className="text-sm text-gray-400 m-0 mt-1">Select a vehicle from the catalog to see cutting diagrams and battery cutout guidelines.</p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search make or model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading catalog database...</div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No vehicles match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((v) => (
            <Link
              key={v.id}
              to={`/vehicles/${v.id}`}
              className="glass-card hover:glass-panel rounded-2xl overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300 group border border-white/5 hover:border-purple-500/25"
            >
              {/* Thumbnail */}
              <div className="h-44 bg-slate-900 flex justify-center items-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent z-10 opacity-60" />
                <Car className="w-12 h-12 text-slate-800 absolute group-hover:scale-110 transition-transform duration-300" />
                <span className="absolute bottom-3 left-4 z-20 text-xs font-semibold text-purple-400 uppercase tracking-wider bg-purple-950/60 px-2.5 py-1 rounded-md border border-purple-500/20">
                  {v.year}
                </span>
              </div>

              {/* Card info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors m-0">
                    {v.make} {v.model}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 m-0">ID Ref: {v.id}</p>
                </div>

                <div className="border-t border-white/5 pt-3 flex justify-between items-center">
                  <span className="text-xs font-medium text-purple-400 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> {v.safetyGuidelines.length} safety items
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Vehicle Detail Page
function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [alerting, setAlerting] = useState(false);
  const [alertStatus, setAlertStatus] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    apiClient
      .getVehicle(id)
      .then((data) => {
        setVehicle(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [id]);

  const handleTriggerAlert = async (severity: 'INFO' | 'WARNING' | 'CRITICAL') => {
    if (!vehicle) return;
    setAlerting(true);
    setAlertStatus(null);

    try {
      const res = await apiClient.triggerAlert({
        vehicleId: vehicle.id,
        severity,
        message: `EMERGENCY ALERT: Active extrication scan triggered on ${vehicle.year} ${vehicle.make} ${vehicle.model}. Ensure HV cuts are isolate!`,
        latitude: 37.7749,
        longitude: -122.4194
      });
      setAlertStatus({ success: true, alertId: res.alertId });
    } catch (err: any) {
      console.error(err);
      setAlertStatus({ success: false, message: 'Could not connect to dispatch' });
    } finally {
      setAlerting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading safety guide specifications...</div>;
  }

  if (!vehicle) {
    return <div className="text-center py-12 text-red-400">Vehicle model not found inside the directory.</div>;
  }

  // Priority color maps
  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/10 text-red-400 border border-red-500/30';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
    }
  };

  return (
    <div className="space-y-10">
      {/* Back link */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <Link to="/vehicles" className="text-xs text-purple-400 font-semibold uppercase hover:text-purple-300 transition-colors flex items-center gap-1">
          &larr; Back to Catalog
        </Link>
        <span className="text-xs text-gray-500">ID: {vehicle.id}</span>
      </div>

      {/* Main Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white m-0">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>
          <p className="text-sm text-gray-400 m-0 mt-1">First Responder Emergency Cut and Airbag Safety Isolation Guide</p>
        </div>

        {/* Dispatch action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleTriggerAlert('CRITICAL')}
            disabled={alerting}
            className="bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_4px_15px_rgba(239,68,68,0.2)]"
          >
            <ShieldAlert className="w-4 h-4" /> Trigger Critical Dispatch
          </button>
          <button
            onClick={() => handleTriggerAlert('WARNING')}
            disabled={alerting}
            className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4" /> Trigger Alert
          </button>
        </div>
      </div>

      {/* Alert outcome toast */}
      {alertStatus && (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${alertStatus.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {alertStatus.success ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span>{alertStatus.success ? `Emergency dispatch alerted! ID Reference: ${alertStatus.alertId}` : alertStatus.message}</span>
          </div>
          <button onClick={() => setAlertStatus(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Video and Guidelines */}
        <div className="lg:col-span-2 space-y-8">
          {/* Video Player */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 space-y-4">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white m-0">Video Guide: CUT and ISOLATION zones</h3>
              </div>
              <span className="text-xs text-gray-500 font-semibold tracking-wider uppercase">Emergency AV</span>
            </div>

            <div className="px-5 pb-5">
              <div className="aspect-video bg-black/60 rounded-xl overflow-hidden border border-white/5 flex justify-center items-center relative">
                {/* Embedded HTML5 Video Player */}
                <video
                  src={`${API_BASE_URL}/public${vehicle.videoUrl}`}
                  controls
                  poster={`${API_BASE_URL}/public${vehicle.thumbnailUrl}`}
                  className="w-full h-full object-contain"
                >
                  Your browser does not support HTML5 video streaming tags.
                </video>
              </div>
            </div>
          </div>

          {/* Safety Guidelines Priority Sorted */}
          <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <ShieldAlert className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white m-0">Isolated Safety Guidelines</h3>
            </div>

            <div className="space-y-4">
              {vehicle.safetyGuidelines && vehicle.safetyGuidelines.length > 0 ? (
                vehicle.safetyGuidelines
                  .sort((a: any, b: any) => {
                    const weight: any = { critical: 4, high: 3, medium: 2, low: 1 };
                    return (weight[b.priority.toLowerCase()] || 0) - (weight[a.priority.toLowerCase()] || 0);
                  })
                  .map((g: any, index: number) => (
                    <div
                      key={index}
                      className="p-5 rounded-xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-white m-0">{g.title}</h4>
                        <p className="text-sm text-gray-400 leading-relaxed m-0">{g.description}</p>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md shrink-0 self-start md:self-auto ${getPriorityStyle(g.priority)}`}>
                        {g.priority}
                      </span>
                    </div>
                  ))
              ) : (
                <div className="text-sm text-gray-400 text-center py-4">No specific safety guidelines documented.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Features Groups */}
        <div className="space-y-8">
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <Layers className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white m-0">Features & Structural Tech</h3>
            </div>

            <div className="space-y-6">
              {vehicle.features && vehicle.features.length > 0 ? (
                vehicle.features.map((f: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <span className="text-xs text-purple-400 font-bold tracking-wider uppercase">{f.category}</span>
                    <ul className="m-0 pl-0 list-none space-y-2">
                      {f.items.map((item: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-purple-500/60 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-400 text-center py-2">No specific features logged.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Router root entry App
export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<VehiclesCatalog />} />
          <Route path="/vehicles/:id" element={<VehicleDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
