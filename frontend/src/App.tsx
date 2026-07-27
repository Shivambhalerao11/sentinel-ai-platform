import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Sun, Moon, Radio, Shield } from "lucide-react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { PoliceDashboard } from "./components/PoliceDashboard";
import { CaseManagement } from "./components/CaseManagement";
import { GisMap } from "./components/GisMap";
import { PredictiveAnalytics } from "./components/PredictiveAnalytics";
import { CitizenView } from "./components/CitizenView";
import { SettingsAudit } from "./components/SettingsAudit";
import { SosModal } from "./components/SosModal";
import CinematicLanding from "./landing/CinematicLanding";
import { OfficerManagement } from "./components/OfficerManagement";
import { MobileBottomNav } from "./components/MobileBottomNav";
import { User, Complaint, PoliceStation, PatrolUnit } from "./types";
import {
  fetchComplaints,
  fetchPoliceStations,
  fetchPatrolUnits,
} from "./services/api";
import { useTheme } from "./context/ThemeContext";

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const { themeMode, setThemeMode } = useTheme();

  // Stable — setThemeMode is already memoized in ThemeContext
  const handleThemeChange = useCallback((mode: "light" | "dark") => {
    setThemeMode(mode);
  }, [setThemeMode]);

  const [currentUser, setCurrentUser] = useState<User>({
    id: "usr-01",
    full_name: "Inspector C. Sterling",
    email: "c.sterling@delhipolice.gov.in",
    role: "police_admin",
    badge_number: "IND-POL-8841",
    rank: "Inspector Level 4",
    station_name: "Connaught Place HQ",
  });

  const [activeTab, setActiveTab] = useState<string>("command");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [patrolUnits, setPatrolUnits] = useState<PatrolUnit[]>([]);
  const [selectedCaseFromDashboard, setSelectedCaseFromDashboard] = useState<Complaint | null>(null);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Stable across renders — only recreated if setters change (they don't)
  const loadData = useCallback(async () => {
    try {
      const [cData, sData, pData] = await Promise.all([
        fetchComplaints(),
        fetchPoliceStations(),
        fetchPatrolUnits(),
      ]);
      setComplaints(cData);
      setStations(sData);
      setPatrolUnits(pData);
    } catch (err) {
      console.error("Failed to load initial backend data:", err);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadData]);

  useEffect(() => {
    const savedToken = localStorage.getItem("sentinel_access_token");
    const savedUserData = localStorage.getItem("sentinel_user_data");
    if (savedToken && savedUserData) {
      try {
        const user = JSON.parse(savedUserData);
        setCurrentUser(user);
        setIsAuthenticated(true);
        setActiveTab(user.role === "citizen" ? "citizen_home" : "command");
      } catch (err) {
        localStorage.removeItem("sentinel_access_token");
        localStorage.removeItem("sentinel_user_data");
      }
    }
  }, []);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab(user.role === "citizen" ? "citizen_home" : "command");
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("sentinel_access_token");
    localStorage.removeItem("sentinel_refresh_token");
    localStorage.removeItem("sentinel_user_data");
    setIsAuthenticated(false);
  }, []);

  const handleRoleSwitch = useCallback((role: "citizen" | "police_admin") => {
    if (role === "citizen") {
      setCurrentUser(prev => ({
        id: "usr-cit-01",
        full_name: prev.role === "citizen" ? prev.full_name : "Rahul Kapoor",
        email: prev.role === "citizen" ? prev.email : "rahul.k@example.com",
        role: "citizen",
      }));
      setActiveTab("citizen_home");
    } else {
      setCurrentUser({
        id: "usr-01",
        full_name: "Inspector C. Sterling",
        email: "c.sterling@delhipolice.gov.in",
        role: "police_admin",
        badge_number: "IND-POL-8841",
        rank: "Inspector Level 4",
        station_name: "Connaught Place HQ",
      });
      setActiveTab("command");
    }
  }, []);

  const handleGlobalSearch = useCallback((query: string) => {
    setSearchFilter(query);
    setActiveTab(prev => (prev === "citizen_home" ? "status" : "cases"));
  }, []);

  // Stable callbacks passed to children — won't cause re-renders
  const handleOpenSos      = useCallback(() => setIsSosOpen(true),  []);
  const handleCloseSos     = useCallback(() => setIsSosOpen(false), []);
  const handleSosTriggered = useCallback(() => loadData(),           [loadData]);
  const handleTabChange    = useCallback((tab: string) => setActiveTab(tab), []);

  const handleOpenCase = useCallback((c: Complaint) => {
    setSelectedCaseFromDashboard(c);
    setActiveTab("cases");
  }, []);

  const handleClearSelectedCase = useCallback(() => {
    setSelectedCaseFromDashboard(null);
  }, []);

  const handleGisSelectComplaint = useCallback((c: Complaint) => {
    setSelectedCaseFromDashboard(c);
    setActiveTab("cases");
  }, []);

  if (!isAuthenticated) {
    return <CinematicLanding onLoginSuccess={handleLoginSuccess} />;
  }

  const dark = themeMode === "dark";

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200 ${
        dark ? "bg-[#0B172A] text-slate-100 dark" : "bg-[#F8FAFC] text-[#0F172A]"
      }`}
    >
      <Header
        currentUser={currentUser}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
        onSearch={handleGlobalSearch}
        onOpenSos={handleOpenSos}
        onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
        activeTab={activeTab}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onOpenSos={handleOpenSos}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
        />

        <main
          className={`flex-1 overflow-y-auto transition-colors duration-200 ${
            dark ? "bg-[#0F172A] text-slate-100" : "bg-[#F8FAFC] text-[#0F172A]"
          }`}
        >
          {/* POLICE ADMIN VIEWS */}
          {currentUser.role !== "citizen" && (
            <>
              {activeTab === "command" && (
                <PoliceDashboard
                  complaints={complaints}
                  stations={stations}
                  patrolUnits={patrolUnits}
                  onOpenCase={handleOpenCase}
                  onOpenSos={handleOpenSos}
                  onNavigateToTab={handleTabChange}
                  themeMode={themeMode}
                />
              )}

              {activeTab === "cases" && (
                <CaseManagement
                  complaints={complaints}
                  stations={stations}
                  patrolUnits={patrolUnits}
                  onRefresh={loadData}
                  selectedCaseFromDashboard={selectedCaseFromDashboard}
                  onClearSelectedCase={handleClearSelectedCase}
                />
              )}

              {activeTab === "gis" && (
                <div className="p-4 md:p-6 h-[calc(100vh-80px)] flex flex-col">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h1 className="text-lg font-extrabold uppercase">
                        GIS TACTICAL MAP & FIELD DISPATCH INTERFACE
                      </h1>
                      <p className="text-xs font-mono-data opacity-80">
                        Real-time station locations, live complaints, active patrol units, and predictive hotspots.
                      </p>
                    </div>
                  </div>
                  <div className="flex-1">
                    <GisMap
                      complaints={complaints}
                      stations={stations}
                      patrolUnits={patrolUnits}
                      onSelectComplaint={handleGisSelectComplaint}
                    />
                  </div>
                </div>
              )}

              {activeTab === "analytics" && <PredictiveAnalytics />}
              {activeTab === "officers"  && <OfficerManagement currentUser={currentUser} />}
              {(activeTab === "settings" || activeTab === "audit_logs") && (
                <SettingsAudit currentUser={currentUser} />
              )}
            </>
          )}

          {/* CITIZEN VIEWS */}
          {currentUser.role === "citizen" && (
            <CitizenView
              activeSubTab={activeTab}
              onTabChange={handleTabChange}
              onOpenSos={handleOpenSos}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer
        className={`border-t px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs transition-colors shrink-0 z-20 ${
          dark
            ? "bg-[#07111E] border-slate-800 text-slate-300"
            : "bg-white border-slate-200 text-slate-700 shadow-sm"
        }`}
      >
        <div className="flex items-center space-x-3 mb-2 sm:mb-0">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold uppercase tracking-wider">
              {currentUser.role === "police_admin" ? "POLICE HQ COMMAND NODE" : "CITIZEN SAFETY PORTAL"}
            </span>
          </div>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline font-mono text-[10px] opacity-75">
            BNS 2023 ENCRYPTED SESSION ACTIVE
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>APPEARANCE THEME:</span>
          </span>
          <div
            className={`p-1 rounded-xl border flex items-center space-x-1 ${
              dark ? "bg-[#0B172A] border-slate-700" : "bg-slate-100 border-slate-300"
            }`}
          >
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title="Light Theme"
              className={`px-3 py-1 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center ${
                !dark
                  ? "bg-white text-slate-900 shadow-md border border-slate-300 scale-105"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              ☀️
            </button>
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title="Dark Theme"
              className={`px-3 py-1 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center ${
                dark
                  ? "bg-blue-600 text-white shadow-md border border-blue-500 scale-105"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              🌙
            </button>
          </div>
        </div>
      </footer>

      <SosModal
        isOpen={isSosOpen}
        onClose={handleCloseSos}
        onSosTriggered={handleSosTriggered}
      />

      <MobileBottomNav
        currentRole={currentUser.role}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onOpenSos={handleOpenSos}
      />
    </div>
  );
}

export default App;
