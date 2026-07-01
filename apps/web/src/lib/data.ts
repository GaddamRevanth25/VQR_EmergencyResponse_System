export const vehicles = [
  { name: "Toyota Camry", year: "2024", match: "98%", vin: "VQR-7C2-941", color: "bg-blue-600" },
  { name: "Honda Accord", year: "2023", match: "86%", vin: "VQR-2AF-108", color: "bg-slate-700" },
  { name: "Ford F-150 Lightning", year: "2022", match: "79%", vin: "VQR-EV-512", color: "bg-amber-500" },
];

export const savedTravels = [
  { route: "Bay Bridge incident response", date: "Today, 08:42", vehicle: "Toyota Camry 2024", scans: "3 scans" },
  { route: "I-280 northbound assist", date: "Yesterday, 19:18", vehicle: "F-150 Lightning", scans: "1 scan" },
  { route: "Mission St. vehicle check", date: "Jun 27, 14:06", vehicle: "Honda Accord", scans: "2 scans" },
];

export const safety = [
  {
    title: "High-Voltage Battery",
    priority: "Critical",
    body: "Avoid orange cabling. Stabilize vehicle and isolate 12V before cutting pillars or floor pan.",
    color: "bg-red-600 text-white",
  },
  {
    title: "Emergency Shutoff",
    priority: "High",
    body: "Primary service disconnect is beneath rear passenger seat; secondary is under hood left rail.",
    color: "bg-amber-500 text-slate-950",
  },
  {
    title: "Airbag Inflators",
    priority: "Medium",
    body: "Side curtain inflators run along roof rail. Maintain 10 inch clearance during extrication.",
    color: "bg-blue-600 text-white",
  },
];
