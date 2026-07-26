import React, { useEffect, useState } from "react";
import { Settings, UserCheck, Globe, FileText, Search } from "lucide-react";
import { User, AuditLog } from "../types";
import { fetchAuditLogs } from "../services/api";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader } from "../design/Card";
import { Input, Select } from "../design/Input";
import { useTheme } from "../context/ThemeContext";

interface Props { currentUser: User; themeMode?: "light" | "dark"; }

export const SettingsAudit: React.FC<Props> = ({ currentUser }) => {
  const { themeMode } = useTheme();
  const dark = themeMode === "dark";
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [lang, setLang]       = useState("English");

  useEffect(() => {
    fetchAuditLogs().then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  const txt  = dark ? "text-white"     : "text-[#0F172A]";
  const sub  = dark ? "text-slate-400" : "text-[#475569]";
  const cell = `px-3 py-2.5 text-xs font-mono`;

  return (
    <PageShell dark={dark} motifs>
      <SectionHeader dark={dark}
        icon={<Settings className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
        title="System Configuration & Security Audit"
        subtitle="Officer Credentials · Audit Trail · Localization · Security Parameters"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left: Profile + Lang */}
        <div className="space-y-5">
          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
            <SectionHeader dark={dark}
              icon={<UserCheck className={`w-3.5 h-3.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
              title="Officer Identity"
            />
            <div className="space-y-4 text-xs">
              <div>
                <p className={`text-[10px] font-mono font-bold uppercase mb-1 ${sub}`}>Officer Name</p>
                <p className={`font-black text-sm ${txt}`}>{currentUser.full_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Badge",   val: currentUser.badge_number || currentUser.badgeNumber || "IND-POL-8841" },
                  { label: "Rank",    val: currentUser.rank         || "Inspector Level 4" },
                ].map(f => (
                  <div key={f.label} className={`p-3 rounded-xl ${dark ? "bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]" : "bg-[#F8FAFC] border border-[#E2E8F0]"}`}>
                    <p className={`text-[10px] font-mono ${sub}`}>{f.label}</p>
                    <p className={`font-black text-xs mt-0.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`}>{f.val}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className={`text-[10px] font-mono font-bold uppercase mb-1 ${sub}`}>Precinct / Station</p>
                <p className={`font-bold ${txt}`}>{(currentUser as any).stationName || "Connaught Place HQ"}</p>
              </div>
              <div>
                <p className={`text-[10px] font-mono font-bold uppercase mb-1 ${sub}`}>Email</p>
                <p className={`font-medium ${txt}`}>{currentUser.email}</p>
              </div>
            </div>
          </Card>

          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
            <SectionHeader dark={dark}
              icon={<Globe className={`w-3.5 h-3.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
              title="Localization"
            />
            <Select dark={dark} label="Portal Language" value={lang} onChange={e => setLang(e.target.value)}>
              <option value="English">English (Official Government)</option>
              <option value="Hindi">हिन्दी (Hindi)</option>
              <option value="Marathi">मराठी (Marathi)</option>
              <option value="Tamil">தமிழ் (Tamil)</option>
              <option value="Bengali">বাংলা (Bengali)</option>
            </Select>
          </Card>
        </div>

        {/* Right: Audit logs */}
        <div className="lg:col-span-2">
          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
            <SectionHeader dark={dark}
              icon={<FileText className={`w-3.5 h-3.5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
              title="System Audit Trail"
              action={
                <div className="relative w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Filter logs..."
                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-[11px] font-mono focus:outline-none transition-all ${dark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-slate-200 placeholder-slate-500" : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]"}`}
                  />
                </div>
              }
            />
            <div className="overflow-x-auto max-h-[480px] rounded-xl overflow-y-auto">
              <table className="w-full text-left">
                <thead className={`sticky top-0 text-[10px] font-mono uppercase ${dark ? "bg-[#0B1A2F] text-slate-400" : "bg-[#F8FAFC] text-[#475569]"}`}
                  style={{ borderBottom: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #E2E8F0" }}>
                  <tr>
                    {["Time","Action","Actor","Details","IP"].map(h => (
                      <th key={h} className={`${cell} font-black tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? <tr><td colSpan={5} className={`${cell} text-center ${sub}`}>Loading logs...</td></tr>
                    : filtered.map(l => (
                      <tr key={l.id} className={`border-b transition-colors ${dark ? "border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)]" : "border-[#F1F5F9] hover:bg-[#F8FAFC]"}`}>
                        <td className={`${cell} ${sub} text-[10px]`}>{l.timestamp}</td>
                        <td className={`${cell} font-black ${dark ? "text-amber-400" : "text-[#163A70]"}`}>{l.action}</td>
                        <td className={`${cell} ${txt}`}>{l.user}</td>
                        <td className={`${cell} ${sub} text-[11px] max-w-[200px] truncate`}>{l.details}</td>
                        <td className={`${cell} ${sub} text-[10px]`}>{l.ip}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};
