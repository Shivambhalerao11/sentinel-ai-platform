import React, { useState, useEffect } from "react";
import { Shield, UserPlus, Search, BadgeCheck, Building2, Phone, Mail, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { User } from "../types";
import { createOfficerAccount, fetchOfficerList } from "../services/api";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader } from "../design/Card";
import { Button, StatusBadge } from "../design/Button";
import { Input, Select } from "../design/Input";
import { useTheme } from "../context/ThemeContext";

interface Props { currentUser: User; token?: string; themeMode?: "light" | "dark"; }

export const OfficerManagement: React.FC<Props> = ({ currentUser, token = "auth_token_default" }) => {
  const { themeMode } = useTheme();
  const dark = themeMode === "dark";
  const [officers, setOfficers]   = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback]   = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [phone, setPhone]       = useState("");
  const [empId, setEmpId]       = useState("");
  const [rank, setRank]         = useState("Sub-Inspector");
  const [dept, setDept]         = useState("Crime Branch & AI Unit");
  const [password, setPassword] = useState("Police@2026");
  const [role, setRole]         = useState<"police_admin"|"police_officer">("police_officer");

  const txt = dark ? "text-white" : "text-[#0F172A]";
  const sub = dark ? "text-slate-400" : "text-[#475569]";

  const load = async () => {
    setLoading(true);
    try {
      setOfficers(await fetchOfficerList(token));
    } catch {
      setOfficers([
        { id:"u1", full_name:"Inspector C. Sterling", email:"c.sterling@delhipolice.gov.in", phone:"+91 98100 11223", role:"police_admin", badge_number:"IND-POL-8841", rank:"Inspector Level 4", department:"Crime Branch & AI Unit", precinct:"Precinct 01", account_status:"active" },
        { id:"u2", full_name:"ACP R. K. Sharma",      email:"rk.sharma@delhipolice.gov.in",  phone:"+91 98111 22334", role:"police_admin", badge_number:"IND-POL-1002", rank:"Asst. Commissioner",   department:"Special Operations",   precinct:"Precinct 01", account_status:"active" },
      ]);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await createOfficerAccount(token, { name, email, phone, employeeId: empId || `IND-POL-${Math.floor(1000+Math.random()*9000)}`, password, rank, department: dept, stationId: "ST-01", precinct: "Precinct 01 - HQ", role });
      setFeedback({ type: "success", text: `Officer provisioned: ${res.user.full_name}` });
      setShowModal(false); setName(""); setEmail(""); setPhone(""); setEmpId(""); load();
    } catch (err: any) {
      setFeedback({ type: "error", text: err.message || "Failed to create officer." });
    } finally { setSubmitting(false); }
  };

  const filtered = officers.filter(o =>
    (o.full_name || o.name || "").toLowerCase().includes(search.toLowerCase()) ||
    o.email.toLowerCase().includes(search.toLowerCase()) ||
    (o.badge_number || o.badgeNumber || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PageShell dark={dark} motifs>
      {/* Header banner */}
      <div className="rounded-2xl p-5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ background: dark ? "linear-gradient(135deg,#0F2340 0%,#163A70 100%)" : "linear-gradient(135deg,#163A70 0%,#0F2340 100%)", border: "1px solid rgba(212,175,55,0.15)", boxShadow: "0 4px 24px rgba(22,58,112,0.25)" }}>
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#8B6914,#D4AF37)", boxShadow: "0 4px 12px rgba(212,175,55,0.3)" }}>
            <Shield className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-black uppercase text-white tracking-wide">Officer Management</h1>
              <span className="bg-amber-400/15 text-amber-300 border border-amber-400/25 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono">ADMIN API</span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">Provision & Manage Authorized Police Officers</p>
          </div>
        </div>
        <Button variant="gold" size="sm" icon={<UserPlus className="w-3.5 h-3.5" />}
          onClick={() => { setFeedback(null); setShowModal(true); }}>
          Provision Officer
        </Button>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`mb-4 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold border ${feedback.type === "success" ? (dark ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-800") : (dark ? "bg-red-500/10 border-red-500/25 text-red-400" : "bg-red-50 border-red-200 text-red-800")}`}>
          <div className="flex items-center space-x-2">
            {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold underline cursor-pointer text-[11px]">Dismiss</button>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="relative w-full max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search officer, email, badge..."
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-[11px] font-mono focus:outline-none transition-all ${dark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-slate-200 placeholder-slate-500" : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]"}`} />
        </div>
        <div className={`flex items-center space-x-3 text-xs font-mono ${sub}`}>
          <span>Total: <strong className={txt}>{officers.length}</strong></span>
          <button onClick={load} className="flex items-center space-x-1 text-blue-500 hover:underline cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading
        ? <p className={`text-center text-xs py-12 ${sub}`}>Loading officer roster...</p>
        : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(officer => (
              <Card key={officer.id} variant={dark ? "elevated" : "default"} dark={dark} padding="md" hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-black text-sm ${txt}`}>{officer.full_name || officer.name}</span>
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className={`text-xs font-semibold text-amber-500`}>{officer.rank || "Police Officer"}</p>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono ${dark ? "bg-blue-500/15 text-blue-400" : "bg-blue-100 text-blue-800"}`}>
                    {officer.badge_number || officer.badgeNumber || "IND-POL-XXXX"}
                  </span>
                </div>
                <div className={`space-y-1.5 text-[11px] font-mono mb-3 ${sub}`}>
                  <p className="flex items-center space-x-2"><Mail className="w-3.5 h-3.5" /><span>{officer.email}</span></p>
                  <p className="flex items-center space-x-2"><Phone className="w-3.5 h-3.5" /><span>{officer.phone}</span></p>
                  <p className="flex items-center space-x-2"><Building2 className="w-3.5 h-3.5" /><span>{officer.precinct || "HQ Precinct 01"}</span></p>
                </div>
                <div className={`pt-3 border-t flex items-center justify-between ${dark ? "border-[rgba(255,255,255,0.07)]" : "border-[#F1F5F9]"}`}>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className={`text-[10px] font-mono font-bold ${dark ? "text-emerald-400" : "text-emerald-700"}`}>
                      {(officer.account_status || "active").toUpperCase()}
                    </span>
                  </div>
                  <StatusBadge label={officer.role.replace("_"," ")} type="neutral" />
                </div>
              </Card>
            ))}
          </div>
        )}

      {/* Provision modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}>
          <div className={`w-full max-w-lg rounded-2xl p-6 space-y-4 ${dark ? "bg-[#0B1A2F] border border-[rgba(255,255,255,0.09)]" : "bg-white border border-[#E2E8F0]"} shadow-[0_20px_60px_rgba(0,0,0,0.4)]`}>
            <div className={`flex items-center justify-between pb-4 border-b ${dark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E2E8F0]"}`}>
              <div className="flex items-center space-x-2">
                <Shield className={`w-5 h-5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />
                <h3 className={`font-black uppercase text-sm ${txt}`}>Provision New Officer</h3>
              </div>
              <span className="text-[9px] bg-amber-400/15 text-amber-500 font-black px-2 py-0.5 rounded uppercase font-mono border border-amber-400/25">ADMIN AUTH</span>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <Input dark={dark} label="Full Name *" required value={name} onChange={e => setName(e.target.value)} placeholder="Inspector V. Singh" />
              <div className="grid grid-cols-2 gap-2">
                <Input dark={dark} label="Official Email *" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="v.singh@police.gov.in" />
                <Input dark={dark} label="Mobile *" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98111 00000" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input dark={dark} label="Employee ID" value={empId} onChange={e => setEmpId(e.target.value)} placeholder="IND-POL-9022" />
                <Select dark={dark} label="Rank" value={rank} onChange={e => setRank(e.target.value)}>
                  <option>Sub-Inspector</option>
                  <option>Inspector Level 4</option>
                  <option>Assistant Commissioner (ACP)</option>
                  <option>Superintendent of Police</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Select dark={dark} label="Department" value={dept} onChange={e => setDept(e.target.value)}>
                  <option>Crime Branch & AI Unit</option>
                  <option>Cyber Crime Cell</option>
                  <option>Special Operations</option>
                  <option>Traffic & Field Unit</option>
                </Select>
                <Input dark={dark} label="Password *" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className={`flex justify-end space-x-3 pt-3 border-t ${dark ? "border-[rgba(255,255,255,0.08)]" : "border-[#E2E8F0]"}`}>
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="gold" size="sm" loading={submitting} type="submit">Provision Officer</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
};
