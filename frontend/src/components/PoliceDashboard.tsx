import React, { useEffect, useState, useMemo, useCallback, memo } from "react";
import { Radio, ChevronRight, Sparkles } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Complaint, AnalyticsSummary, PoliceStation, PatrolUnit } from "../types";
import { fetchAnalytics } from "../services/api";
import { GisMap } from "./GisMap";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader, KpiCard } from "../design/Card";
import { Button } from "../design/Button";

interface Props {
  complaints: Complaint[];
  stations: PoliceStation[];
  patrolUnits: PatrolUnit[];
  onOpenCase: (c: Complaint) => void;
  onOpenSos: () => void;
  onNavigateToTab: (tab: string) => void;
  themeMode?: "light" | "dark";
}

export const PoliceDashboard: React.FC<Props> = memo(({
  complaints, stations, patrolUnits,
  onOpenCase, onOpenSos, onNavigateToTab, themeMode = "light",
}) => {
  const dark = themeMode === "dark";
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  useEffect(() => { fetchAnalytics().then(setAnalytics).catch(() => {}); }, []);

  // Memoized — only recomputes when complaints array changes
  const emergency = useMemo(
    () => complaints.filter(c => c.isEmergency || c.priority === "CRITICAL"),
    [complaints]
  );

  // Stable callbacks — prevent child re-renders from new function refs
  const handleOpenFirstEmergency = useCallback(
    () => { if (emergency[0]) onOpenCase(emergency[0]); },
    [emergency, onOpenCase]
  );
  const handleOpenCase = useCallback(
    (c: Complaint) => onOpenCase(c),
    [onOpenCase]
  );
  const handleNavAnalytics = useCallback(() => onNavigateToTab("analytics"), [onNavigateToTab]);
  const handleNavGis       = useCallback(() => onNavigateToTab("gis"),       [onNavigateToTab]);

  const txt  = dark ? "text-white"    : "text-[#0F172A]";
  const sub  = dark ? "text-slate-400" : "text-[#475569]";

  return (
    <PageShell dark={dark} motifs>
      {/* ── Emergency banner ──────────────────────────────────────────────── */}
      {emergency.length > 0 && (
        <div className="mb-5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-emergency-pulse"
          style={{ background: "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)", border: "1px solid #B91C1C", boxShadow: "0 4px 20px rgba(220,38,38,0.35)" }}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
              <Radio className="w-5 h-5 text-white animate-spin" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-0.5">
                <span className="bg-white/20 text-white text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                  {emergency.length} ACTIVE SOS
                </span>
                <span className="text-red-200 text-[10px] font-mono">IMMEDIATE DISPATCH</span>
              </div>
              <h2 className="text-sm font-black text-white">{emergency[0].title}</h2>
              <p className="text-[11px] text-red-200 font-mono">{emergency[0].address}</p>
            </div>
          </div>
          <Button variant="gold" size="sm" onClick={handleOpenFirstEmergency}>
            Open Incident Command
          </Button>
        </div>
      )}

      {/* ── KPI grid ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 ds-stagger">
        <KpiCard dark={dark} accent="blue"    label="Total Cases"      value={analytics?.totalComplaints    ?? 1284} sub="+12%" />
        <KpiCard dark={dark} accent="neutral" label="Pending Dispatch" value={analytics?.pendingComplaints  ?? 432}  sub="2.4m lag" />
        <KpiCard dark={dark} accent="red"     label="Critical"         value={analytics?.emergencyCases     ?? 24}   sub="ACTION" />
        <KpiCard dark={dark} accent="green"   label="Clearance Rate"   value={`${analytics?.clearanceRate ?? 63.4}%`} sub="Target 65%" />
        <KpiCard dark={dark} accent="neutral" label="Units in Field"   value={patrolUnits.length + 180}     sub="92% online" />
        <KpiCard dark={dark} accent="gold"    label="SOS Beacons"      value={emergency.length}             sub="LIVE" />
      </div>

      {/* ── Main workspace ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Chart + Intelligence alert */}
        <div className="lg:col-span-2 space-y-5">
          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="lg">
            <SectionHeader dark={dark} title="Predictive Density Analysis"
              subtitle="Stochastic crime modeling · Temporal variance ±4.2%"
              action={
                <button onClick={handleNavAnalytics}
                  className={`text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors ${dark ? "text-amber-400 hover:text-amber-300" : "text-[#2563EB] hover:text-[#1d4ed8]"}`}>
                  <span>Full AI Insights</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              }
            />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.weeklyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? "rgba(255,255,255,0.06)" : "#E2E8F0"} />
                  <XAxis dataKey="day" stroke={dark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} />
                  <YAxis stroke={dark ? "#64748B" : "#94A3B8"} fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ background: dark ? "#0B1A2F" : "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 11 }} />
                  <Bar dataKey="total"     fill="#163A70" radius={[4,4,0,0]} name="Total" />
                  <Bar dataKey="emergency" fill="#DC2626" radius={[4,4,0,0]} name="Emergency" />
                  <Bar dataKey="resolved"  fill="#16A34A" radius={[4,4,0,0]} name="Resolved" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-xs font-mono">
              {[
                { label: "Response Latency", val: "4m 12s", sub: "−18%" },
                { label: "AI Accuracy",      val: "91.4%",  sub: "NOMINAL" },
              ].map(m => (
                <div key={m.label} className={`p-2.5 rounded-xl ${dark ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)]" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}>
                  <p className={`text-[10px] uppercase ${sub}`}>{m.label}</p>
                  <p className={`font-black text-sm ${txt}`}>{m.val}
                    <span className="text-emerald-500 text-[10px] ml-1">{m.sub}</span>
                  </p>
                </div>
              ))}
              <div className={`p-2.5 rounded-xl flex items-end justify-end ${dark ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)]" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}>
                <Button variant="primary" size="xs" onClick={() => alert("Exporting CSV...")}>
                  Export CSV
                </Button>
              </div>
            </div>
          </Card>

          {/* Intelligence alert */}
          <Card variant="gold" dark={dark} padding="md">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className={`text-[11px] font-black uppercase tracking-wider ${dark ? "text-amber-300" : "text-amber-800"}`}>
                OPERATIONAL INTELLIGENCE ALERT
              </span>
            </div>
            <p className={`text-xs leading-relaxed mb-3 ${dark ? "text-slate-300" : "text-slate-700"}`}>
              System detected <b>+14.2% Type-B Cyber APK phishing fraud</b> (Central District).
              Probability of escalation 22:00–02:00. Recommended: <b>Tactical Deterrent — Zone 4</b>.
            </p>
            <div className="flex items-center space-x-2">
              <Button variant="primary" size="xs" onClick={() => alert("Deploying to Zone 4...")}>Initiate Deployment</Button>
              <Button variant="ghost"   size="xs" onClick={() => alert("Acknowledged.")}>Acknowledge</Button>
            </div>
          </Card>
        </div>

        {/* Right: GIS map + Activity feed */}
        <div className="space-y-5">
          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                <span className={`text-[11px] font-black uppercase ${txt}`}>GIS Tactical Feed</span>
              </div>
              <button onClick={handleNavGis}
                className={`text-[11px] font-bold cursor-pointer transition-colors ${dark ? "text-amber-400 hover:text-amber-300" : "text-[#2563EB] hover:text-[#1d4ed8]"}`}>
                Expand ↗
              </button>
            </div>
            <div className="h-56 rounded-xl overflow-hidden">
              <GisMap complaints={complaints} stations={stations} patrolUnits={patrolUnits} onSelectComplaint={handleOpenCase} />
            </div>
          </Card>

          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
            <SectionHeader dark={dark} title="Field Activity" subtitle="Latest cases · Priority sorted" />
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {complaints.slice(0, 4).map(c => (
                <div key={c.id} onClick={() => handleOpenCase(c)}
                  className={`p-3 rounded-xl cursor-pointer transition-all space-y-1 ${dark ? "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] border border-[rgba(255,255,255,0.05)]" : "bg-[#F8FAFC] hover:bg-blue-50/40 border border-[#E2E8F0]"}`}>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-black text-[#163A70] dark:text-amber-400">{c.id}</span>
                    <span className={`font-black px-1.5 py-0.5 rounded text-[9px] uppercase ${c.priority === "CRITICAL" ? "bg-red-100 text-red-700" : c.priority === "HIGH" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {c.priority}
                    </span>
                  </div>
                  <p className={`font-bold text-xs ${txt}`}>{c.title}</p>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className={sub}>{c.assignedOfficerName ?? "UNASSIGNED"}</span>
                    <span className="text-emerald-600 font-bold">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
});

PoliceDashboard.displayName = "PoliceDashboard";
