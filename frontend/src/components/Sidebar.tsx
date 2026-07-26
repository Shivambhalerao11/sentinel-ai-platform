import React, { memo } from "react";
import {
  LayoutDashboard, FileText, MapPin, TrendingUp,
  Settings, ShieldAlert, PlusCircle, Radio, Search,
  MessageSquare, History, UserCheck, FileCheck2, Building2,
} from "lucide-react";
import { UserRole } from "../types";
import { HeritageMotif } from "../design/HeritageMotif";
import { useTheme } from "../context/ThemeContext";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  emergency?: boolean;
  highlight?: boolean;
}

interface SidebarProps {
  currentRole: UserRole;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSos: () => void;
  themeMode?: "light" | "dark";
  onThemeChange?: (mode: "light" | "dark") => void;
}

const POLICE_ITEMS: NavItem[] = [
  { id: "command",    label: "Command Dashboard",  icon: LayoutDashboard },
  { id: "cases",      label: "Case Management",    icon: FileText,    badge: "LIVE" },
  { id: "gis",        label: "GIS Live View",      icon: MapPin },
  { id: "analytics",  label: "AI Analytics",       icon: TrendingUp },
  { id: "officers",   label: "Officer Management", icon: UserCheck,   badge: "ADMIN" },
  { id: "audit_logs", label: "Audit Logs",         icon: FileCheck2 },
  { id: "settings",   label: "System Config",      icon: Settings },
];

const CITIZEN_ITEMS: NavItem[] = [
  { id: "citizen_home", label: "Home",             icon: Building2 },
  { id: "report",       label: "Report a Crime",   icon: PlusCircle,    highlight: true },
  { id: "sos",          label: "Emergency SOS",    icon: Radio,         emergency: true },
  { id: "status",       label: "Track Complaint",  icon: Search },
  { id: "history",      label: "My Complaints",    icon: History },
  { id: "chatbot",      label: "Suraksha AI",       icon: MessageSquare, badge: "AI" },
  { id: "settings",     label: "Settings",         icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = memo(({
  currentRole, activeTab, onTabChange, onOpenSos,
}) => {
  const { themeMode } = useTheme();
  const dark    = themeMode === "dark";
  const isPolice = currentRole !== "citizen";
  const items   = isPolice ? POLICE_ITEMS : CITIZEN_ITEMS;

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-[calc(100vh-57px)] relative overflow-hidden"
      style={{
        background: dark
          ? "linear-gradient(180deg, #0B1A2F 0%, #07111E 100%)"
          : "linear-gradient(180deg, #163A70 0%, #0F2340 100%)",
        borderRight: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.2)",
      }}
    >
      {/* Heritage motif — corner decoration */}
      <div className="absolute bottom-16 right-2 pointer-events-none">
        <HeritageMotif size={72} opacity={0.09} corner="br" gold />
      </div>

      {/* Subtle inner glow top */}
      <div className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 40% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 100%)" }} />

      {/* ── Portal badge ──────────────────────────────────────────────────── */}
      <div className="p-3 pt-4">
        <div className="rounded-xl px-3 py-2.5 mb-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isPolice ? "bg-amber-400" : "bg-emerald-500"}`}>
              {isPolice
                ? <UserCheck className="w-4 h-4 text-slate-900" />
                : <Building2  className="w-4 h-4 text-white" />}
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Portal</p>
              <p className="text-[11px] font-black text-white uppercase font-mono">
                {isPolice ? "Police Command" : "Citizen Portal"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 pb-2 overflow-y-auto space-y-0.5">
        {items.map(item => {
          const Icon     = item.icon;
          const isActive = activeTab === item.id;

          if (item.emergency) return (
            <button key={item.id} onClick={onOpenSos}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide cursor-pointer bg-[#DC2626] text-white hover:bg-[#B91C1C] transition-all animate-emergency-pulse my-1">
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-mono">LIVE</span>
            </button>
          );

          return (
            <button key={item.id} onClick={() => onTabChange(item.id)}
              className={[
                "w-full flex items-center justify-between px-3 py-2.5 rounded-xl",
                "text-[11px] font-bold uppercase tracking-wide cursor-pointer",
                "transition-all duration-200",
                isActive
                  ? "bg-white text-[#163A70] shadow-[0_2px_12px_rgba(0,0,0,0.2)] font-black"
                  : item.highlight
                    ? "text-amber-300 hover:bg-[rgba(212,175,55,0.1)] hover:text-amber-200"
                    : "text-slate-300 hover:bg-[rgba(255,255,255,0.07)] hover:text-white",
              ].join(" ")}>
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? "text-[#163A70]" : item.highlight ? "text-amber-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded font-mono ${
                  item.badge === "AI"   ? "bg-cyan-400 text-slate-950" :
                  item.badge === "ADMIN"? "bg-amber-400/20 text-amber-300 border border-amber-400/30" :
                  "bg-red-500 text-white"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2 space-y-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {/* SOS bottom button */}
        <button onClick={onOpenSos}
          className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-[0_2px_8px_rgba(220,38,38,0.35)]">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
          <span>RAPID DISPATCH SOS</span>
        </button>

        {/* Branding */}
        <div className="px-1 space-y-0.5">
          <p className="text-[10px] font-black text-white tracking-wide font-mono">SENTINEL · GOI · MHA</p>
          <p className="text-[9px] text-slate-500 font-mono">© 2026 · BNS 2023 · RESTRICTED</p>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = "Sidebar";
