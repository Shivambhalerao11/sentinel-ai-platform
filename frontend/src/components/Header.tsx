import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert, Search, Bell, Radio, UserCheck,
  CheckCheck, AlertTriangle, User as UserIcon,
  ChevronDown, LogOut, Volume2, VolumeX, Sun, Moon, Menu,
} from "lucide-react";
import { User, NotificationItem } from "../types";
import { fetchNotifications, markNotificationRead } from "../services/api";
import { HeritageMotif } from "../design/HeritageMotif";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  currentUser: User;
  onRoleSwitch: (role: "citizen" | "police_admin") => void;
  onLogout?: () => void;
  onSearch: (query: string) => void;
  onOpenSos: () => void;
  onToggleMobileMenu?: () => void;
  activeTab: string;
  themeMode?: "light" | "dark";
  onThemeChange?: (mode: "light" | "dark") => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser, onRoleSwitch, onLogout, onSearch,
  onOpenSos, onToggleMobileMenu,
}) => {
  const { themeMode, toggleTheme } = useTheme();
  const dark = themeMode === "dark";
  const [searchQuery, setSearchQuery]         = useState("");
  const [timeStr, setTimeStr]                 = useState("");
  const [notifications, setNotifications]     = useState<NotificationItem[]>([]);
  const [showNotif, setShowNotif]             = useState(false);
  const [showUser, setShowUser]               = useState(false);
  const [soundEnabled, setSoundEnabled]       = useState(true);

  /* Live IST clock */
  useEffect(() => {
    const tick = () => {
      setTimeStr(new Date().toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }) + " IST");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  /* Poll notifications */
  useEffect(() => {
    const load = async () => {
      try { setNotifications(await fetchNotifications()); } catch {}
    };
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  const unread = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) onSearch(searchQuery.trim());
  };

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id);
    setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  /* Base style helpers */
  const hdr  = dark ? "bg-[#070F1C]/95 border-[rgba(255,255,255,0.07)]" : "bg-white/95 border-[#E2E8F0]";
  const txt  = dark ? "text-slate-200" : "text-[#0F172A]";
  const sub  = dark ? "text-slate-400" : "text-[#475569]";
  const pill = dark
    ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-slate-300"
    : "bg-[#F1F5F9] border border-[#E2E8F0] text-[#475569]";
  const inp  = dark
    ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-slate-100 placeholder-slate-500 focus:border-[#D4AF37]"
    : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB]";
  const drop = dark
    ? "bg-[#0B1A2F] border border-[rgba(255,255,255,0.09)] shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
    : "bg-white border border-[#E2E8F0] shadow-[0_8px_40px_rgba(7,17,30,0.14)]";

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 py-2.5 flex items-center justify-between transition-colors duration-300 ${hdr}`}>

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center transition-colors"
          title="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Heritage motif beside logo */}
        <div className="relative">
          <div className={`p-2 rounded-xl flex items-center justify-center shadow-sm ${dark ? "bg-[#163A70]" : "bg-[#163A70]"}`}>
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ds-pulse" />
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <span className="font-black text-[#163A70] tracking-wider text-sm uppercase">
              SENTINEL
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${dark ? "bg-amber-400/15 text-amber-400 border border-amber-400/20" : "bg-[#163A70]/10 text-[#163A70] border border-[#163A70]/15"}`}>
              AI · GOV
            </span>
          </div>
          <p className={`text-[10px] font-mono tracking-tight ${sub}`}>
            NATIONAL INTELLIGENCE NETWORK
          </p>
        </div>

        {/* Decorative motif — only on wide screens */}
        <div className="hidden xl:block ml-2 opacity-25">
          <HeritageMotif size={32} opacity={1} corner="tr" gold />
        </div>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search cases, officers, locations..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl text-[11px] font-mono transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 ${inp}`}
          />
        </div>
      </form>

      {/* ── Right controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center space-x-2">

        {/* Clock + secure pill */}
        <div className={`hidden md:flex items-center space-x-2 text-[11px] font-mono px-3 py-1.5 rounded-xl border ${pill}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ds-pulse" />
          <span className="font-semibold hidden lg:inline">SECURE</span>
          <span className={`font-bold ${dark ? "text-slate-200" : "text-[#0F172A]"}`}>{timeStr || "—:—:— IST"}</span>
        </div>

        {/* SOS */}
        <button onClick={onOpenSos}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[10px] font-black px-3 py-2 rounded-xl flex items-center space-x-1.5 shadow-[0_2px_8px_rgba(220,38,38,0.4)] hover:shadow-[0_4px_16px_rgba(220,38,38,0.5)] transition-all cursor-pointer uppercase tracking-wide animate-emergency-pulse">
          <Radio className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">SOS</span>
        </button>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className={`px-2.5 py-1.5 rounded-xl flex items-center space-x-1.5 text-xs font-mono transition-all cursor-pointer border ${
            dark
              ? "bg-[rgba(255,255,255,0.07)] border-[rgba(255,255,255,0.12)] text-amber-300 hover:bg-[rgba(255,255,255,0.14)]"
              : "bg-[#F1F5F9] border-[#E2E8F0] text-[#163A70] hover:bg-[#E2E8F0]"
          }`}
          title={`Switch to ${dark ? "Light" : "Dark"} Mode`}
        >
          {dark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline font-bold">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#163A70]" />
              <span className="hidden md:inline font-bold">Dark</span>
            </>
          )}
        </button>

        {/* Sound */}
        <button onClick={() => setSoundEnabled(s => !s)}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${dark ? "bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)]" : "bg-[#F1F5F9] hover:bg-[#E2E8F0]"}`}>
          {soundEnabled
            ? <Volume2 className={`w-4 h-4 ${dark ? "text-slate-300" : "text-[#163A70]"}`} />
            : <VolumeX className="w-4 h-4 text-red-500" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => { setShowNotif(s => !s); setShowUser(false); }}
            className={`w-8 h-8 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${dark ? "bg-[rgba(255,255,255,0.07)] hover:bg-[rgba(255,255,255,0.12)]" : "bg-[#F1F5F9] hover:bg-[#E2E8F0]"}`}>
            <Bell className={`w-4 h-4 ${dark ? "text-slate-300" : "text-[#163A70]"}`} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#DC2626] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center font-mono animate-bounce">
                {unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className={`absolute right-0 mt-2 w-80 md:w-96 rounded-2xl py-2 z-50 overflow-hidden ${drop}`}>
              <div className={`px-4 py-2.5 border-b flex items-center justify-between ${dark ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]" : "border-[#E2E8F0] bg-[#F8FAFC]"}`}>
                <div className="flex items-center space-x-2">
                  <Bell className={`w-3.5 h-3.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />
                  <span className={`font-black uppercase text-[11px] tracking-wider ${dark ? "text-white" : "text-[#0F172A]"}`}>Alerts</span>
                </div>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase font-mono ${dark ? "bg-amber-400/15 text-amber-400" : "bg-[#163A70] text-white"}`}>
                  {unread} UNREAD
                </span>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)]">
                {notifications.length === 0
                  ? <p className={`p-4 text-center text-xs ${sub}`}>No alerts.</p>
                  : notifications.map(n => (
                    <div key={n.id} className={`p-3.5 transition-colors ${!n.read ? (dark ? "bg-amber-400/5" : "bg-blue-50/40") : ""} ${dark ? "hover:bg-[rgba(255,255,255,0.04)]" : "hover:bg-[#F8FAFC]"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          {n.type === "EMERGENCY"
                            ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            : <ShieldAlert    className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                          <span className={`font-bold text-[11px] ${n.type === "EMERGENCY" ? "text-red-500" : (dark ? "text-slate-200" : "text-[#0F172A]")}`}>
                            {n.title}
                          </span>
                        </div>
                        <span className={`text-[10px] font-mono shrink-0 ${sub}`}>{n.timestamp}</span>
                      </div>
                      <p className={`text-[11px] mt-1 leading-snug ${sub}`}>{n.message}</p>
                      {!n.read && (
                        <button onClick={() => markRead(n.id)}
                          className="mt-1.5 text-[10px] text-[#2563EB] hover:underline font-bold flex items-center space-x-1 cursor-pointer">
                          <CheckCheck className="w-3 h-3" /><span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className={`relative pl-2 border-l ${dark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E2E8F0]"}`}>
          <button onClick={() => { setShowUser(s => !s); setShowNotif(false); }}
            className={`flex items-center space-x-2 px-2 py-1 rounded-xl transition-all cursor-pointer ${dark ? "hover:bg-[rgba(255,255,255,0.07)]" : "hover:bg-[#F1F5F9]"}`}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#163A70] to-[#2563EB] text-white flex items-center justify-center font-black text-[10px] shadow-sm">
              {currentUser.role === "citizen" ? "CIT" : "POL"}
            </div>
            <div className="hidden sm:block text-left">
              <p className={`text-[11px] font-bold leading-tight ${txt}`}>{currentUser.full_name}</p>
              <p className={`text-[10px] font-mono ${sub}`}>{currentUser.role === "citizen" ? "Citizen" : currentUser.rank || "Officer"}</p>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 ${sub}`} />
          </button>

          {showUser && (
            <div className={`absolute right-0 mt-2 w-60 rounded-2xl py-2 z-50 overflow-hidden ${drop}`}>
              <div className={`px-4 py-3 border-b ${dark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E2E8F0]"}`}>
                <p className={`font-black text-sm ${txt}`}>{currentUser.full_name}</p>
                <p className={`text-[11px] font-mono ${sub}`}>{currentUser.email}</p>
                {(currentUser.badge_number || currentUser.badgeNumber) && (
                  <p className="text-[10px] font-mono text-amber-500 mt-0.5">
                    BADGE: {currentUser.badge_number || currentUser.badgeNumber}
                  </p>
                )}
              </div>
              <div className={`p-2 border-b ${dark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E2E8F0]"}`}>
                {currentUser.role !== "citizen" && (
                  <>
                    <p className={`text-[10px] uppercase font-bold px-2 mb-1 ${sub}`}>View Mode</p>
                    <button onClick={() => { onRoleSwitch("police_admin"); setShowUser(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 text-[11px] transition-all cursor-pointer mb-1 ${currentUser.role !== "citizen" ? (dark ? "bg-[#163A70] text-white" : "bg-[#163A70] text-white") : (dark ? "hover:bg-[rgba(255,255,255,0.07)] text-slate-300" : "hover:bg-[#F1F5F9] text-[#0F172A]")}`}>
                      <UserCheck className="w-3.5 h-3.5" /><span>Police Command</span>
                    </button>
                    <button onClick={() => { onRoleSwitch("citizen"); setShowUser(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center space-x-2 text-[11px] transition-all cursor-pointer ${dark ? "hover:bg-[rgba(255,255,255,0.07)] text-slate-300" : "hover:bg-[#F1F5F9] text-[#0F172A]"}`}>
                      <UserIcon className="w-3.5 h-3.5" /><span>Citizen Portal</span>
                    </button>
                  </>
                )}
              </div>
              <div className="p-2">
                <button onClick={() => { setShowUser(false); onLogout?.(); }}
                  className="w-full text-left px-3 py-2 text-[11px] text-red-500 hover:bg-red-500/10 rounded-xl flex items-center space-x-2 cursor-pointer font-bold transition-all">
                  <LogOut className="w-3.5 h-3.5" /><span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
