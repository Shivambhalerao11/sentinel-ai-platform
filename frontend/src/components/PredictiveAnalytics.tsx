import React, { useEffect, useState } from "react";
import { TrendingUp, AlertTriangle, Flame, Award, Sparkles, BarChart2, FileCheck2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { AnalyticsSummary, AIInsightsData } from "../types";
import { fetchAnalytics, fetchAiInsights } from "../services/api";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader } from "../design/Card";

const COLORS = ["#163A70","#2563EB","#D97706","#DC2626","#0284C7","#16A34A"];

interface Props { themeMode?: "light"|"dark"; }

export const PredictiveAnalytics: React.FC<Props> = ({ themeMode = "light" }) => {
  const dark = themeMode === "dark";
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [insights,  setInsights]  = useState<AIInsightsData  | null>(null);

  useEffect(() => {
    Promise.all([fetchAnalytics(), fetchAiInsights()])
      .then(([a,i]) => { setAnalytics(a); setInsights(i); }).catch(() => {});
  }, []);

  const txt  = dark ? "text-white"     : "text-[#0F172A]";
  const sub  = dark ? "text-slate-400" : "text-[#475569]";
  const tip  = { background: dark ? "#0B1A2F" : "#0F172A", border: "none", borderRadius: 12, color: "#fff", fontSize: 11 };

  return (
    <PageShell dark={dark} motifs>
      <SectionHeader dark={dark}
        icon={<TrendingUp className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
        title="Predictive Crime Analytics & AI Insights"
        subtitle="Crime Trend Modeling · Hotspot Prediction · Fake Report Filter"
        action={
          <span className={`flex items-center space-x-1.5 text-[11px] px-3 py-1.5 rounded-xl font-black font-mono ${dark ? "bg-cyan-400/10 border border-cyan-400/20 text-cyan-400" : "bg-cyan-50 border border-cyan-200 text-cyan-800"}`}>
            <Sparkles className="w-3.5 h-3.5" /><span>SENTINEL AI 4.2 ONLINE</span>
          </span>
        }
      />

      {/* AI Summary banner */}
      {insights && (
        <Card variant="command" dark={dark} padding="md" className="mb-5">
          <div className="flex items-center space-x-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-black text-[11px] uppercase tracking-wider">Executive Intelligence Summary</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">{insights.crimeTrendSummary}</p>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
          <SectionHeader dark={dark} icon={<BarChart2 className={`w-3.5 h-3.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />} title="Crime Category Distribution" />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.categoryBreakdown ?? []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={dark ? "rgba(255,255,255,0.06)" : "#E2E8F0"} />
                <XAxis type="number" stroke={dark ? "#64748B" : "#94A3B8"} fontSize={10} />
                <YAxis dataKey="category" type="category" stroke={dark ? "#64748B" : "#94A3B8"} fontSize={9} width={110} />
                <Tooltip contentStyle={tip} />
                <Bar dataKey="count" fill="#2563EB" radius={[0,4,4,0]} name="Cases" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
          <SectionHeader dark={dark} title="District Risk Distribution" />
          <div className="h-56 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics?.districtDistribution ?? []} dataKey="count" nameKey="district" cx="50%" cy="50%" outerRadius={80}
                  label={({ district, percent }) => `${district} (${(percent*100).toFixed(0)}%)`}
                  labelLine={{ stroke: dark ? "#475569" : "#94A3B8" }}>
                  {(analytics?.districtDistribution ?? []).map((_,i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Hotspots + Patterns + Fake filter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
          <SectionHeader dark={dark} icon={<Flame className="w-3.5 h-3.5 text-red-500" />} title="Predicted Hotspots" />
          <div className="space-y-3">
            {insights?.hotspotPredictions.map((hp,i) => (
              <div key={i} className={`p-3 rounded-xl space-y-1 ${dark ? "bg-red-500/10 border border-red-500/20" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${dark ? "text-red-300" : "text-red-800"}`}>{hp.locationName}</span>
                  <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded font-mono">{hp.probability}%</span>
                </div>
                <p className={`text-[10px] font-mono ${sub}`}>{hp.timeWindow}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
          <SectionHeader dark={dark} icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />} title="Suspicious Patterns" />
          <div className="space-y-3">
            {insights?.suspiciousPatterns.map((sp,i) => (
              <div key={i} className={`p-3 rounded-xl space-y-1 ${dark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-bold text-xs ${dark ? "text-amber-300" : "text-amber-900"}`}>{sp.title}</span>
                  <span className="bg-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded font-mono">{sp.severity}</span>
                </div>
                <p className={`text-[11px] leading-snug ${sub}`}>{sp.detail}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
          <SectionHeader dark={dark} icon={<FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />} title="Fake Report Filter" />
          <div className="space-y-3 text-xs font-mono">
            {[
              { label:"Reports Analyzed", val: insights?.fakeComplaintSummary.totalAnalyzed ?? 1324 },
              { label:"Flagged Fake",     val: `${insights?.fakeComplaintSummary.flaggedCount ?? 38} (2.8%)` },
            ].map(m => (
              <div key={m.label} className={`p-3 rounded-xl flex justify-between ${dark ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)]" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}>
                <span className={sub}>{m.label}</span>
                <span className={`font-black ${txt}`}>{m.val}</span>
              </div>
            ))}
            <div className={`p-3 rounded-xl ${dark ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.07)]" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}>
              <span className={`block text-[10px] font-black uppercase mb-1.5 ${sub}`}>Common Fake Markers</span>
              <ul className={`list-disc list-inside text-[11px] space-y-0.5 font-sans ${sub}`}>
                {insights?.fakeComplaintSummary.commonMarkers.map((m,i) => <li key={i}>{m}</li>)}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      {/* Officer performance table */}
      <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
        <SectionHeader dark={dark} icon={<Award className="w-3.5 h-3.5 text-amber-500" />} title="Officer Performance Matrix" />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`sticky top-0 font-mono uppercase text-[10px] ${dark ? "text-slate-400" : "text-[#475569]"}`}
              style={{ borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #E2E8F0" }}>
              <tr>
                {["Officer","Badge","Resolved","Active Load","Score"].map(h => (
                  <th key={h} className="px-3 py-2.5 font-black tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className={`divide-y ${dark ? "divide-[rgba(255,255,255,0.05)]" : "divide-[#F1F5F9]"}`}>
              {analytics?.officerPerformance.map((o,i) => (
                <tr key={i} className={`transition-colors ${dark ? "hover:bg-[rgba(255,255,255,0.03)]" : "hover:bg-[#F8FAFC]"}`}>
                  <td className={`px-3 py-2.5 font-bold ${txt}`}>{o.name}</td>
                  <td className={`px-3 py-2.5 font-mono ${sub}`}>{o.badge}</td>
                  <td className="px-3 py-2.5 font-black font-mono text-emerald-500">{o.resolved}</td>
                  <td className="px-3 py-2.5 font-black font-mono text-amber-500">{o.active}</td>
                  <td className={`px-3 py-2.5 font-black font-mono ${dark ? "text-amber-400" : "text-[#163A70]"}`}>⭐ {o.rating}/5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
};
