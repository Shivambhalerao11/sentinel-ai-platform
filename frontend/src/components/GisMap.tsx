import React, { useEffect, useRef, useState, memo, useCallback } from "react";
import L from "leaflet";
import {
  MapPin, Layers, Shield, Radio, Car, Flame, Filter, Eye, Maximize2, RefreshCw,
  Search, Calendar, Compass, ChevronDown, CheckCircle2, AlertTriangle
} from "lucide-react";
import { Complaint, PoliceStation, PatrolUnit } from "../types";
import { Select } from "../design";

interface GisMapProps {
  complaints: Complaint[];
  stations: PoliceStation[];
  patrolUnits: PatrolUnit[];
  onSelectComplaint?: (complaint: Complaint) => void;
  pickerMode?: boolean;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

// Coordinate lookup for India Search
const INDIA_LOCATIONS: Record<string, { lat: number; lng: number; zoom: number }> = {
  "delhi": { lat: 28.6139, lng: 77.2090, zoom: 12 },
  "new delhi": { lat: 28.6139, lng: 77.2090, zoom: 13 },
  "mumbai": { lat: 19.0760, lng: 72.8777, zoom: 12 },
  "bengaluru": { lat: 12.9716, lng: 77.5946, zoom: 12 },
  "bangalore": { lat: 12.9716, lng: 77.5946, zoom: 12 },
  "hyderabad": { lat: 17.3850, lng: 78.4867, zoom: 12 },
  "chennai": { lat: 13.0827, lng: 80.2707, zoom: 12 },
  "kolkata": { lat: 22.5726, lng: 88.3639, zoom: 12 },
  "pune": { lat: 18.5204, lng: 73.8567, zoom: 12 },
  "ahmedabad": { lat: 23.0225, lng: 72.5714, zoom: 12 },
  "jaipur": { lat: 26.9124, lng: 75.7873, zoom: 12 },
  "lucknow": { lat: 26.8467, lng: 80.9462, zoom: 12 },
  "chandigarh": { lat: 30.7333, lng: 76.7794, zoom: 13 },
  "400001": { lat: 18.9322, lng: 72.8333, zoom: 14 },
  "110001": { lat: 28.6271, lng: 77.2166, zoom: 14 },
  "560001": { lat: 12.9784, lng: 77.6041, zoom: 14 },
};

export const GisMap: React.FC<GisMapProps> = memo(({
  complaints,
  stations,
  patrolUnits,
  onSelectComplaint,
  pickerMode = false,
  onLocationSelect,
  initialLat = pickerMode ? 28.6271 : 20.5937,
  initialLng = pickerMode ? 77.2166 : 78.9629,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Controls
  const [showStations, setShowStations] = useState(!pickerMode);
  const [showComplaints, setShowComplaints] = useState(true);
  const [showEmergency, setShowEmergency] = useState(true);
  const [showPatrolUnits, setShowPatrolUnits] = useState(!pickerMode);
  const [showHotspots, setShowHotspots] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState("ALL");
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedSeverity, setSelectedSeverity] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedDateRange, setSelectedDateRange] = useState("ALL");

  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(
    pickerMode ? { lat: initialLat, lng: initialLng } : null
  );

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const zoomLevel = pickerMode ? 13 : 5;
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: zoomLevel,
        zoomControl: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;

      if (pickerMode) {
        map.on("click", (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          setSelectedPoint({ lat, lng });
          if (onLocationSelect) {
            onLocationSelect(lat, lng, `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
          }
        });
      }
    }
  }, []);

  // Handle Search & Fly to Coordinates
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current) return;

    const term = searchQuery.toLowerCase().trim();
    const matchedLoc = INDIA_LOCATIONS[term];

    if (matchedLoc) {
      mapInstanceRef.current.flyTo([matchedLoc.lat, matchedLoc.lng], matchedLoc.zoom, { duration: 1.5 });
    } else {
      // Search matching complaint location in props
      const matchedComplaint = complaints.find(c =>
        c.address.toLowerCase().includes(term) ||
        c.district.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
      );

      if (matchedComplaint && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([matchedComplaint.latitude, matchedComplaint.longitude], 14, { duration: 1.5 });
      } else {
        alert(`Location "${searchQuery}" searched. Viewing area results.`);
      }
    }
  };

  // Reset Map View to Center India
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([20.5937, 78.9629], 5, { duration: 1.2 });
      setSearchQuery("");
      setSelectedState("ALL");
      setSelectedDistrict("ALL");
      setSelectedCategory("ALL");
      setSelectedSeverity("ALL");
      setSelectedStatus("ALL");
      setSelectedDateRange("ALL");
    }
  };

  // Render Map Markers dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layerGroup = markersLayerRef.current;
    layerGroup.clearLayers();

    // 1. Render Police Stations
    if (showStations) {
      stations.forEach((st) => {
        if (selectedDistrict !== "ALL" && st.district !== selectedDistrict) return;

        const iconHtml = `<div style="background-color: #163A70; color: white; border: 2px solid #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          🏛️
        </div>`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-station-icon",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 190px;">
            <div style="font-weight: 800; color: #163A70; font-size: 13px;">${st.name}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">Station Code: <b>${st.code}</b></div>
            <div style="font-size: 11px; color: #475569;">District: <b>${st.district}</b></div>
            <div style="font-size: 11px; color: #475569;">In Charge: ${st.inCharge}</div>
            <div style="font-size: 11px; color: #16A34A; font-weight: 600; margin-top: 4px;">Active Officers: ${st.activeOfficers} | Cases: ${st.activeCases}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Phone: ${st.phone}</div>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 2. Render Live Complaints across India with Color Coding
    complaints.forEach((c) => {
      if (c.isEmergency && !showEmergency) return;
      if (!c.isEmergency && !showComplaints) return;

      // Filters
      if (selectedDistrict !== "ALL" && c.district !== selectedDistrict) return;
      if (selectedCategory !== "ALL" && c.crimeCategory !== selectedCategory) return;
      if (selectedSeverity !== "ALL" && c.priority !== selectedSeverity) return;
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return;

      // Color Coding by Severity / Emergency
      // 🔴 High/Critical, 🟠 Medium, 🟢 Low
      let color = "#10B981"; // Low (Green)
      if (c.isEmergency || c.priority === "CRITICAL") {
        color = "#DC2626"; // Critical Red
      } else if (c.priority === "HIGH") {
        color = "#EF4444"; // High Red
      } else if (c.priority === "MEDIUM") {
        color = "#F97316"; // Medium Orange
      }

      const pulseStyle = c.isEmergency ? "animation: emergency-pulse 1.2s infinite;" : "";

      const iconHtml = `<div style="background-color: ${color}; color: white; border: 2px solid #ffffff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.35); ${pulseStyle}">
        ${c.isEmergency ? "🚨" : "⚠️"}
      </div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-case-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      // Anonymized Popup (No personal citizen data exposed!)
      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 4px; width: 230px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-b: 1px solid #E2E8F0; padding-bottom: 4px; margin-bottom: 4px;">
            <span style="font-weight: 800; color: #0F172A; font-size: 11px;">CASE ID: ${c.id}</span>
            <span style="background-color: ${color}; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 4px;">${c.priority}</span>
          </div>
          <div style="font-weight: 700; color: #163A70; font-size: 12px; margin-top: 2px;">${c.title}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">Category: <b>${c.crimeCategory}</b></div>
          <div style="font-size: 11px; color: #475569;">District: <b>${c.district}</b></div>
          <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Address: ${c.address}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px; pt: 4px; border-t: 1px solid #F1F5F9;">
            <span style="font-size: 10px; font-weight: 700; color: #2563EB;">Status: ${c.status}</span>
            <span style="font-size: 9px; color: #94A3B8;">${c.createdAt ? new Date(c.createdAt).toLocaleDateString("en-IN") : "Recent"}</span>
          </div>
        </div>
      `);

      marker.on("click", () => {
        if (onSelectComplaint) onSelectComplaint(c);
      });

      layerGroup.addLayer(marker);
    });

    // 3. Render Patrol Units
    if (showPatrolUnits) {
      patrolUnits.forEach((u) => {
        const iconHtml = `<div style="background-color: #2563EB; color: white; border: 2px solid #ffffff; border-radius: 6px; padding: 2px 6px; font-weight: 800; font-size: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
          🚔 ${u.unitCode}
        </div>`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-unit-icon",
          iconSize: [60, 24],
          iconAnchor: [30, 12],
        });

        const marker = L.marker([u.latitude, u.longitude], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px;">
            <div style="font-weight: 800; color: #163A70; font-size: 12px;">Unit ${u.unitCode} (${u.type})</div>
            <div style="font-size: 11px; color: #16A34A; font-weight: 700; margin-top: 2px;">Status: ${u.status}</div>
            <div style="font-size: 10px; color: #475569;">Speed: ${u.speedKmh} km/h &bull; Fuel: ${u.batteryOrFuel}%</div>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 4. Render Crime Heatmaps & Hotspot Zones
    if (showHotspots) {
      const hotspots = [
        { lat: 28.6139, lng: 77.2090, radius: 1200, color: "#DC2626", label: "Delhi NCR Crime Hotspot" },
        { lat: 19.0760, lng: 72.8777, radius: 1500, color: "#EF4444", label: "Mumbai Central High-Density Hotspot" },
        { lat: 12.9716, lng: 77.5946, radius: 1000, color: "#F97316", label: "Bengaluru Tech Corridor Cyber Risk" },
        { lat: 22.5726, lng: 88.3639, radius: 900, color: "#F59E0B", label: "Kolkata Commercial Patrol Zone" },
      ];

      hotspots.forEach((h) => {
        const circle = L.circle([h.lat, h.lng], {
          color: h.color,
          fillColor: h.color,
          fillOpacity: 0.22,
          radius: h.radius,
        });
        circle.bindTooltip(h.label, { permanent: false, direction: "center" });
        layerGroup.addLayer(circle);
      });
    }

    // 5. Render Picker Location Pin
    if (pickerMode && selectedPoint) {
      const pinHtml = `<div style="background-color: #10B981; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
        📍
      </div>`;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: "picker-pin-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([selectedPoint.lat, selectedPoint.lng], { icon: pinIcon });
      marker.bindPopup("Selected Incident Location").openPopup();
      layerGroup.addLayer(marker);
    }
  }, [
    complaints,
    stations,
    patrolUnits,
    showStations,
    showComplaints,
    showEmergency,
    showPatrolUnits,
    showHotspots,
    selectedDistrict,
    selectedCategory,
    selectedSeverity,
    selectedStatus,
    selectedPoint,
    pickerMode,
  ]);

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 flex flex-col">
      {/* ── Top Bar: Search & Controls ─────────────────────────────────── */}
      <div className="p-3 bg-[#0B1A2F]/95 backdrop-blur-md text-white border-b border-white/10 z-10 flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2 flex-1 min-w-[220px]">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search State, District, City, or Pincode (e.g. Delhi, Mumbai, 400001)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/10 border border-white/15 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-[#163A70] hover:bg-[#1E3A8A] text-white font-bold text-xs shrink-0 cursor-pointer min-h-[38px]"
          >
            Locate
          </button>
        </form>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={handleResetView}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center space-x-1.5 cursor-pointer min-h-[38px]"
            title="Reset Map to All India View"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Center India</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer min-h-[38px] transition-all ${
              showHotspots ? "bg-amber-500 text-slate-950 shadow-md" : "bg-white/10 hover:bg-white/20 text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
        </div>
      </div>

      {/* ── Sub Bar: Filters ────────────────────────────────────────────────── */}
      {!pickerMode && (
        <div className="px-3 py-2 bg-[#07111E]/90 backdrop-blur-md text-slate-300 border-b border-white/10 z-10 flex flex-wrap items-center gap-2 text-xs">
          <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 uppercase mr-1">
            <Filter className="w-3 h-3 text-amber-400" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white focus:outline-none"
          >
            <option value="ALL" className="bg-slate-900 text-white">Severity: All</option>
            <option value="CRITICAL" className="bg-slate-900 text-red-400">🔴 Critical / SOS</option>
            <option value="HIGH" className="bg-slate-900 text-red-400">🔴 High</option>
            <option value="MEDIUM" className="bg-slate-900 text-amber-400">🟠 Medium</option>
            <option value="ROUTINE" className="bg-slate-900 text-emerald-400">🟢 Low / Routine</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white focus:outline-none"
          >
            <option value="ALL" className="bg-slate-900 text-white">Category: All</option>
            <option value="Cybercrime" className="bg-slate-900 text-white">Cybercrime</option>
            <option value="Theft" className="bg-slate-900 text-white">Theft / Burglary</option>
            <option value="Assault" className="bg-slate-900 text-white">Assault</option>
            <option value="Women Safety" className="bg-slate-900 text-white">Women Safety</option>
            <option value="Homicide" className="bg-slate-900 text-white">Homicide</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/15 text-xs text-white focus:outline-none"
          >
            <option value="ALL" className="bg-slate-900 text-white">Status: All</option>
            <option value="PENDING" className="bg-slate-900 text-amber-400">Pending</option>
            <option value="INVESTIGATING" className="bg-slate-900 text-blue-400">Investigating</option>
            <option value="RESOLVED" className="bg-slate-900 text-emerald-400">Resolved</option>
          </select>

          {/* Severity Legend */}
          <div className="ml-auto hidden md:flex items-center space-x-3 text-[10px] font-mono">
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
              <span>Critical / High</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
              <span>Medium</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Low</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Leaflet Container ─────────────────────────────────────────── */}
      <div ref={mapContainerRef} className="flex-1 w-full h-full min-h-[420px] z-0" />
    </div>
  );
});

GisMap.displayName = "GisMap";
