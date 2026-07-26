import React, { useState, useEffect } from "react";
import { Radio, AlertTriangle, CheckCircle2, Phone, X, ShieldAlert, MapPin, Volume2 } from "lucide-react";
import { triggerEmergencySos } from "../services/api";
import { Complaint } from "../types";

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSosTriggered?: (sosComplaint: Complaint) => void;
}

export const SosModal: React.FC<SosModalProps> = ({ isOpen, onClose, onSosTriggered }) => {
  const [triggering, setTriggering] = useState(false);
  const [sosResult, setSosResult] = useState<Complaint | null>(null);
  const [locationStr, setLocationStr] = useState("Fetching satellite GPS coordinates...");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.209 });

  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStr(
            `GPS satellite fix: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E (Central Precinct)`
          );
        },
        () => {
          setLocationStr("Central District HQ (Lat: 28.6139° N, Lng: 77.2090° E)");
        }
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmSos = async () => {
    setTriggering(true);
    try {
      const res = await triggerEmergencySos({
        latitude: coords.lat,
        longitude: coords.lng,
        citizenName: "Rapid Emergency Beacon",
        citizenPhone: "+91 112-SOS-DIRECT",
        address: locationStr,
      });

      setSosResult(res);
      if (onSosTriggered) onSosTriggered(res);
    } catch (err: any) {
      alert("Emergency SOS alert error: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-2 border-red-600 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden space-y-5 animate-scale-up">
        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {sosResult ? (
          /* SOS Success Beacon Dispatch Screen */
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Radio className="w-8 h-8" />
            </div>

            <div>
              <span className="bg-red-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded uppercase font-mono-data tracking-wider">
                RAPID DISPATCH SOS ACTIVE
              </span>
              <h2 className="text-xl font-extrabold text-[#0F172A] mt-2">
                Emergency Signal Broadcasted
              </h2>
              <p className="text-xs text-slate-600 mt-1">
                Your high-priority beacon has been transmitted to Central Dispatch & nearest SWAT / Patrol Units.
              </p>
            </div>

            <div className="bg-slate-900 text-white p-4 rounded-xl text-left font-mono-data text-xs space-y-2">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">BEACON CASE ID:</span>
                <span className="font-extrabold text-amber-400">{sosResult.id}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">ASSIGNED DISPATCH:</span>
                <span className="font-extrabold text-emerald-400">
                  {sosResult.assignedOfficerName || "SWAT Unit PT-09"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">ESTIMATED RESPONSE:</span>
                <span className="font-bold text-white">
                  {sosResult.aiAnalysis.estimatedResponseTime || "1 - 3 Minutes"}
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
              Stay on the line if calling 112. Do not leave your location unless in immediate danger.
            </div>

            <button
              onClick={onClose}
              className="w-full bg-[#163A70] hover:bg-[#1E3A8A] text-white py-2.5 rounded-lg text-xs font-extrabold uppercase tracking-wide cursor-pointer"
            >
              Return to Platform Command
            </button>
          </div>
        ) : (
          /* SOS Confirmation & Trigger Screen */
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto animate-emergency-pulse shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#0F172A]">EMERGENCY RAPID DISPATCH</h2>
              <p className="text-xs text-slate-600 mt-1">
                Trigger immediate high-priority police response and satellite GPS tracking.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-left font-mono-data space-y-1">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">
                CAPTURED LOCATION BEACON
              </span>
              <p className="text-[#0F172A] font-bold flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{locationStr}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 py-3 rounded-xl font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmSos}
                disabled={triggering}
                className="flex-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all animate-emergency-pulse cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-spin text-white" />
                <span>{triggering ? "TRANSMITTING SOS..." : "BROADCAST POLICE SOS"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
