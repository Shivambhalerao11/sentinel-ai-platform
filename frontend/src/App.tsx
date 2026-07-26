import React, { useState, useEffect } from "react";
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
import { User, Complaint, PoliceStation, PatrolUnit } from "./types";
import {
  fetchComplaints,
  fetchPoliceStations,
  fetchPatrolUnits,
} from "./services/api";

import { useTheme } from "./context/ThemeContext";

export function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Global Theme Context
  const { themeMode, setThemeMode } = useTheme();

  const handleThemeChange = (mode: "light" | "dark") => {
    setThemeMode(mode);
  };

  // Current Authenticated User State
  const [currentUser, setCurrentUser] = useState<User>({
    id: "usr-01",
    full_name: "Inspector C. Sterling",
    email: "c.sterling@delhipolice.gov.in",
    role: "police_admin",
    badge_number: "IND-POL-8841",
    rank: "Inspector Level 4",
    station_name: "Connaught Place HQ",
  });

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<string>("command");

  // Global Data Stores
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [stations, setStations] = useState<PoliceStation[]>([]);
  const [patrolUnits, setPatrolUnits] = useState<PatrolUnit[]>([]);
  const [selectedCaseFromDashboard, setSelectedCaseFromDashboard] = useState<Complaint | null>(null);

  // SOS Modal Visibility
  const [isSosOpen, setIsSosOpen] = useState(false);

  // Search Filter State
  const [searchFilter, setSearchFilter] = useState("");

  // Load backend data
  const loadData = async () => {
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
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      const interval = setInterval(loadData, 10000); // Polling every 10s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Login Success Handler
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.role === "citizen") {
      setActiveTab("citizen_home");
    } else {
      setActiveTab("command");
    }
  };

  // Logout Handler
  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  // Role Switcher Handler
  const handleRoleSwitch = (role: "citizen" | "police_admin") => {
    if (role === "citizen") {
      setCurrentUser({
        id: "usr-cit-01",
        full_name: currentUser.role === "citizen" ? currentUser.full_name : "Rahul Kapoor",
        email: currentUser.role === "citizen" ? currentUser.email : "rahul.k@example.com",
        role: "citizen",
      });
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
  };

  // Global Search Handler
  const handleGlobalSearch = (query: string) => {
    setSearchFilter(query);
    if (currentUser.role === "citizen") {
      setActiveTab("status");
    } else {
      setActiveTab("cases");
    }
  };

  // Render Cinematic Landing + Auth if not authenticated
  if (!isAuthenticated) {
    return <CinematicLanding onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div
      className={`min-h-screen flex flex-col font-sans selection:bg-[#2563EB] selection:text-white transition-colors duration-200 ${
        themeMode === "dark" ? "bg-[#0B172A] text-slate-100 dark" : "bg-[#F8FAFC] text-[#0F172A]"
      }`}
    >
      {/* Header */}
      <Header
        currentUser={currentUser}
        onRoleSwitch={handleRoleSwitch}
        onLogout={handleLogout}
        onSearch={handleGlobalSearch}
        onOpenSos={() => setIsSosOpen(true)}
        activeTab={activeTab}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onOpenSos={() => setIsSosOpen(true)}
          themeMode={themeMode}
          onThemeChange={handleThemeChange}
        />

        {/* Content Viewport */}
        <main
          className={`flex-1 overflow-y-auto transition-colors duration-200 ${
            themeMode === "dark" ? "bg-[#0F172A] text-slate-100" : "bg-[#F8FAFC] text-[#0F172A]"
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
                  onOpenCase={(c) => {
                    setSelectedCaseFromDashboard(c);
                    setActiveTab("cases");
                  }}
                  onOpenSos={() => setIsSosOpen(true)}
                  onNavigateToTab={(t) => setActiveTab(t)}
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
                  onClearSelectedCase={() => setSelectedCaseFromDashboard(null)}
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
                      onSelectComplaint={(c) => {
                        setSelectedCaseFromDashboard(c);
                        setActiveTab("cases");
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === "analytics" && <PredictiveAnalytics />}

              {activeTab === "officers" && <OfficerManagement currentUser={currentUser} />}

              {(activeTab === "settings" || activeTab === "audit_logs") && <SettingsAudit currentUser={currentUser} />}
            </>
          )}

          {/* CITIZEN VIEWS */}
          {currentUser.role === "citizen" && (
            <CitizenView
              activeSubTab={activeTab}
              onTabChange={(tab) => setActiveTab(tab)}
              onOpenSos={() => setIsSosOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Persistent Bottom System Footer & Manual Theme Selector */}
      <footer
        className={`border-t px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs transition-colors shrink-0 z-20 ${
          themeMode === "dark"
            ? "bg-[#07111E] border-slate-800 text-slate-300"
            : "bg-white border-slate-200 text-slate-700 shadow-sm"
        }`}
      >
        {/* System Node Telemetry */}
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

        {/* Manual Theme Mode Chooser Option at the Bottom */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center space-x-1">
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>APPEARANCE THEME:</span>
          </span>

          <div
            className={`p-1 rounded-xl border flex items-center space-x-1 ${
              themeMode === "dark" ? "bg-[#0B172A] border-slate-700" : "bg-slate-100 border-slate-300"
            }`}
          >
            {/* Light Theme Button */}
            <button
              type="button"
              onClick={() => handleThemeChange("light")}
              title="Light Theme"
              className={`px-3 py-1 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center ${
                themeMode === "light"
                  ? "bg-white text-slate-900 shadow-md border border-slate-300 scale-105"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              ☀️
            </button>

            {/* Dark Theme Button */}
            <button
              type="button"
              onClick={() => handleThemeChange("dark")}
              title="Dark Theme"
              className={`px-3 py-1 rounded-lg text-sm transition-all cursor-pointer flex items-center justify-center ${
                themeMode === "dark"
                  ? "bg-blue-600 text-white shadow-md border border-blue-500 scale-105"
                  : "opacity-60 hover:opacity-100"
              }`}
            >
              🌙
            </button>
          </div>
        </div>
      </footer>

      {/* Emergency SOS Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        onSosTriggered={() => loadData()}
      />
    </div>
  );
}

export default App;
