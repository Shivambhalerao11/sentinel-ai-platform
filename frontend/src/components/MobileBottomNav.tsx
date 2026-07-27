import React, { memo } from "react";
import {
  Building2, PlusCircle, Radio, Search, History, MessageSquare,
  Settings, LayoutDashboard, FileText, MapPin, TrendingUp, UserCheck
} from "lucide-react";
import { UserRole } from "../types";
import { useTheme } from "../context/ThemeContext";

interface MobileBottomNavProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSos: () => void;
}

interface NavOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emergency?: boolean;
  highlight?: boolean;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = memo(({
  currentRole,
  activeTab,
  onTabChange,
  onOpenSos,
}) => {
  const { themeMode } = useTheme();
  const dark = themeMode === "dark";
  const isPolice = currentRole !== "citizen";

  const citizenItems: NavOption[] = [
    { id: "citizen_home", label: "Home", icon: Building2 },
    { id: "report", label: "Report", icon: PlusCircle, highlight: true },
    { id: "sos", label: "SOS", icon: Radio, emergency: true },
    { id: "status", label: "Track", icon: Search },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const policeItems: NavOption[] = [
    { id: "command", label: "Command", icon: LayoutDashboard },
    { id: "cases", label: "Cases", icon: FileText },
    { id: "sos", label: "SOS", icon: Radio, emergency: true },
    { id: "gis", label: "GIS Map", icon: MapPin },
    { id: "settings", label: "Config", icon: Settings },
  ];

  const items: NavOption[] = isPolice ? policeItems : citizenItems;

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 py-1.5 flex items-center justify-around border-t transition-colors ${
        dark
          ? "bg-[#0B1A2F]/95 backdrop-blur-md border-white/10 text-slate-300"
          : "bg-white/95 backdrop-blur-md border-slate-200 text-slate-700 shadow-lg"
      }`}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        if (item.emergency) {
          return (
            <button
              key={item.id}
              onClick={onOpenSos}
              className="flex flex-col items-center justify-center p-1.5 rounded-xl text-white bg-red-600 hover:bg-red-700 active:scale-95 transition-all shadow-md min-w-[56px] min-h-[48px]"
            >
              <Icon className="w-5 h-5 animate-pulse text-amber-300" />
              <span className="text-[10px] font-black uppercase tracking-wider mt-0.5">{item.label}</span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer min-w-[48px] min-h-[48px] ${
              isActive
                ? dark
                  ? "text-amber-400 font-bold bg-white/10 scale-105"
                  : "text-[#163A70] font-bold bg-slate-100 scale-105"
                : item.highlight
                  ? "text-amber-500 font-semibold"
                  : "opacity-75 hover:opacity-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[10px] uppercase font-bold mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
});

MobileBottomNav.displayName = "MobileBottomNav";
