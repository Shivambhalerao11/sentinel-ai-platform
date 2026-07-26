import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapPin,
  Layers,
  Shield,
  Radio,
  Car,
  Flame,
  Filter,
  Eye,
  Maximize2,
  Minimize2,
  RefreshCw,
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

export const GisMap: React.FC<GisMapProps> = ({
  complaints,
  stations,
  patrolUnits,
  onSelectComplaint,
  pickerMode = false,
  onLocationSelect,
  initialLat = 28.6271,
  initialLng = 77.2166,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility Controls
  const [showStations, setShowStations] = useState(true);
  const [showComplaints, setShowComplaints] = useState(true);
  const [showEmergency, setShowEmergency] = useState(true);
  const [showPatrolUnits, setShowPatrolUnits] = useState(true);
  const [showHotspots, setShowHotspots] = useState(true);

  // Filters
  const [selectedDistrict, setSelectedDistrict] = useState("ALL");
  const [selectedPriority, setSelectedPriority] = useState("ALL");

  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(
    pickerMode ? { lat: initialLat, lng: initialLng } : null
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 13,
        zoomControl: false,
      });

      // Dark Tactical / High-Contrast OpenStreetMap Tiles
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
            onLocationSelect(lat, lng, `Selected Coordinate: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        });
      }
    }

    return () => {
      // Keep map instance persistent across fast re-renders
    };
  }, []);

  // Update Map Markers on Filter/Data change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const layerGroup = markersLayerRef.current;
    layerGroup.clearLayers();

    // 1. Render Police Stations
    if (showStations) {
      stations.forEach((st) => {
        if (selectedDistrict !== "ALL" && st.district !== selectedDistrict) return;

        const iconHtml = `<div style="background-color: #163A70; color: white; border: 2px solid #ffffff; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          🏛️
        </div>`;

        const customIcon = L.divIcon({
          html: iconHtml,
          className: "custom-station-icon",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: Inter, sans-serif; padding: 4px; min-width: 180px;">
            <div style="font-weight: 800; color: #163A70; font-size: 13px;">${st.name}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">CODE: <b>${st.code}</b></div>
            <div style="font-size: 11px; color: #475569;">In Charge: ${st.inCharge}</div>
            <div style="font-size: 11px; color: #16A34A; font-weight: 600; margin-top: 4px;">Active Officers: ${st.activeOfficers} | Active Cases: ${st.activeCases}</div>
            <div style="font-size: 10px; color: #64748B; margin-top: 2px;">${st.phone}</div>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 2. Render Live Complaints & Emergency Cases
    complaints.forEach((c) => {
      if (c.isEmergency && !showEmergency) return;
      if (!c.isEmergency && !showComplaints) return;
      if (selectedDistrict !== "ALL" && c.district !== selectedDistrict) return;
      if (selectedPriority !== "ALL" && c.priority !== selectedPriority) return;

      const bgColor = c.isEmergency
        ? "#DC2626"
        : c.priority === "CRITICAL"
        ? "#E11D48"
        : c.priority === "HIGH"
        ? "#D97706"
        : "#2563EB";

      const pulseClass = c.isEmergency ? "animation: emergency-pulse 1.5s infinite;" : "";

      const iconHtml = `<div style="background-color: ${bgColor}; color: white; border: 2px solid #ffffff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); ${pulseClass}">
        ${c.isEmergency ? "🚨" : "⚠️"}
      </div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: "custom-case-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([c.latitude, c.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: Inter, sans-serif; padding: 4px; width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 800; color: #0F172A; font-size: 11px;">${c.id}</span>
            <span style="background-color: ${bgColor}; color: white; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${c.priority}</span>
          </div>
          <div style="font-weight: 700; color: #163A70; font-size: 12px; margin-top: 4px;">${c.title}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">Category: <b>${c.crimeCategory}</b></div>
          <div style="font-size: 10px; color: #64748B; margin-top: 2px;">Location: ${c.address}</div>
          <div style="font-size: 10px; color: #16A34A; font-weight: 600; margin-top: 4px;">Assigned: ${c.assignedOfficerName || "Pending Assignment"}</div>
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
            <div style="font-size: 10px; color: #475569;">Speed: ${u.speedKmh} km/h | Fuel: ${u.batteryOrFuel}%</div>
            <div style="font-size: 10px; color: #64748B;">Assigned Case: ${u.assignedCaseId || "Patrolling Zone"}</div>
          </div>
        `);
        layerGroup.addLayer(marker);
      });
    }

    // 4. Render Crime Hotspots Circles
    if (showHotspots) {
      const hotspots = [
        { lat: 28.632, lng: 77.22, radius: 400, color: "#DC2626", label: "High Risk Density - Connaught Circle" },
        { lat: 28.6814, lng: 77.2226, radius: 500, color: "#D97706", label: "Burglary Threat Area - Civil Lines" },
      ];

      hotspots.forEach((h) => {
        const circle = L.circle([h.lat, h.lng], {
          color: h.color,
          fillColor: h.color,
          fillOpacity: 0.18,
          radius: h.radius,
        });
        circle.bindTooltip(h.label, { permanent: false, direction: "center" });
        layerGroup.addLayer(circle);
      });
    }

    // 5. Render Picker Pin
    if (pickerMode && selectedPoint) {
      const pinHtml = `<div style="background-color: #16A34A; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
        📍
      </div>`;

      const pinIcon = L.divIcon({
        html: pinHtml,
        className: "picker-pin-icon",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([selectedPoint.lat, selectedPoint.lng], { icon: pinIcon });
      marker.bindPopup("Selected Complaint Location").openPopup();
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
    selectedPriority,
    selectedPoint,
    pickerMode,
  ]);

  return (
    <div className="relative w-full h-full min-h-[450px] bg-[#EEEDF4] rounded-xl overflow-hidden border border-[#E2E8F0] shadow-xs flex flex-col">
      {/* Map Control Floating Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Layer Toggle Chips */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white/90 backdrop-blur-md p-1.5 rounded-lg border border-[#E2E8F0] shadow-md pointer-events-auto text-xs font-mono-data">
          <button
            onClick={() => setShowStations(!showStations)}
            className={`px-2 py-1 rounded flex items-center space-x-1 cursor-pointer transition-all ${
              showStations ? "bg-[#163A70] text-white font-bold" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Stations</span>
          </button>

          <button
            onClick={() => setShowEmergency(!showEmergency)}
            className={`px-2 py-1 rounded flex items-center space-x-1 cursor-pointer transition-all ${
              showEmergency ? "bg-[#DC2626] text-white font-bold" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Emergency SOS</span>
          </button>

          <button
            onClick={() => setShowComplaints(!showComplaints)}
            className={`px-2 py-1 rounded flex items-center space-x-1 cursor-pointer transition-all ${
              showComplaints ? "bg-[#2563EB] text-white font-bold" : "bg-slate-100 text-slate-600"
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Complaints</span>
          </button>

          <button
            onClick={() => setShowPatrolUnits(!showPatrolUnits)}
            className={`px-2 py-1 rounded flex items-center space-x-1 cursor-pointer transition-all ${
              showPatrolUnits ? "bg-[#0284C7] text-white font-bold" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span>Patrol Units</span>
          </button>

          <button
            onClick={() => setShowHotspots(!showHotspots)}
            className={`px-2 py-1 rounded flex items-center space-x-1 cursor-pointer transition-all ${
              showHotspots ? "bg-amber-600 text-white font-bold" : "bg-slate-100 text-slate-600"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hotspots</span>
          </button>
        </div>

        {/* District & Priority Filters */}
        {!pickerMode && (
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-md p-1.5 rounded-lg border border-[#E2E8F0] shadow-md pointer-events-auto text-xs font-mono-data">
            <Filter className="w-3.5 h-3.5 text-[#163A70]" />
            <Select
              variant="light"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="py-1 text-xs"
            >
              <option value="ALL">All Districts</option>
              <option value="Central District">Central District</option>
              <option value="Northern District">Northern District</option>
              <option value="Southern District">Southern District</option>
              <option value="Special Operations">Special Operations</option>
              <option value="Eastern District">Eastern District</option>
            </Select>

            <Select
              variant="light"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="py-1 text-xs"
            >
              <option value="ALL">All Priority</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="ROUTINE">ROUTINE</option>
            </Select>
          </div>
        )}
      </div>

      {/* Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 min-h-[400px]" />

      {/* Map Bottom Status Banner */}
      <div className="bg-[#0F172A] text-white px-3 py-1.5 text-[11px] font-mono-data flex items-center justify-between border-t border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>GIS TACTICAL FEED | LAT: 28.6139° N, LNG: 77.2090° E</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>STATIONS: {stations.length}</span>
          <span>ACTIVE UNITS: {patrolUnits.length}</span>
          <span>TOTAL CASES: {complaints.length}</span>
        </div>
      </div>
    </div>
  );
};
