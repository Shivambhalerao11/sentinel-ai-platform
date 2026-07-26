import React, { useState } from "react";
import { FileText, Search, UserCheck, Sparkles, MapPin, Send } from "lucide-react";
import { Complaint, ComplaintStatus, PoliceStation, PatrolUnit } from "../types";
import { updateComplaintStatus, addOfficerNote } from "../services/api";
import { GisMap } from "./GisMap";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader } from "../design/Card";
import { Button, StatusBadge } from "../design/Button";
import { Input, Select, Textarea } from "../design/Input";
import { useTheme } from "../context/ThemeContext";

interface Props {
  complaints: Complaint[];
  stations?: PoliceStation[];
  patrolUnits?: PatrolUnit[];
  onRefresh: () => void;
  selectedCaseFromDashboard?: Complaint | null;
  onClearSelectedCase?: () => void;
  themeMode?: "light" | "dark";
}

export const CaseManagement: React.FC<Props> = ({
  complaints, stations = [], patrolUnits = [],
  onRefresh, selectedCaseFromDashboard,
}) => {
  const { themeMode } = useTheme();
  const dark = themeMode === "dark";
  const [selected, setSelected]     = useState<Complaint | null>(selectedCaseFromDashboard ?? complaints[0] ?? null);
  const [search, setSearch]         = useState("");
  const [statusF, setStatusF]       = useState("ALL");
  const [priorityF, setPriorityF]   = useState("ALL");
  const [categoryF, setCategoryF]   = useState("ALL");
  const [officer, setOfficer]       = useState("OFF-101");
  const [newStatus, setNewStatus]   = useState<ComplaintStatus>("In Progress");
  const [note, setNote]             = useState("");
  const [submitting, setSubmitting] = useState(false);

  const txt = dark ? "text-white"     : "text-[#0F172A]";
  const sub = dark ? "text-slate-400" : "text-[#475569]";
  const row = dark ? "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]"
                   : "bg-[#F8FAFC] border border-[#E2E8F0]";

  const filtered = complaints.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (![c.id, c.title, c.citizenName, c.address].some(f => f?.toLowerCase().includes(q))) return false;
    }
    if (statusF   !== "ALL" && c.status        !== statusF)   return false;
    if (priorityF !== "ALL" && c.priority       !== priorityF) return false;
    if (categoryF !== "ALL" && c.crimeCategory  !== categoryF) return false;
    return true;
  });

  const updateCase = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await updateComplaintStatus(selected.id, { status: newStatus, officerId: officer, note: note || undefined, actor: "Inspector C. Sterling" });
      setNote(""); onRefresh();
      alert(`Case ${selected.id} → ${newStatus}`);
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  const addNote = async () => {
    if (!selected || !note.trim()) return;
    setSubmitting(true);
    try {
      await addOfficerNote(selected.id, { note: note.trim(), officerName: "Inspector C. Sterling", badgeNumber: "IND-POL-8841" });
      setNote(""); onRefresh(); alert("Note recorded.");
    } catch (e: any) { alert(e.message); }
    finally { setSubmitting(false); }
  };

  return (
    <PageShell dark={dark} motifs maxWidth="1600px">
      <SectionHeader dark={dark}
        icon={<FileText className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
        title="Case Management & Dispatch Queue"
        subtitle="AI Triage · Officer Dispatch · BNS Legal Sections · Timeline Log"
        action={
          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className={`px-3 py-1.5 rounded-xl font-bold ${dark ? "bg-[rgba(255,255,255,0.07)] text-slate-300" : "bg-slate-100 text-slate-700"}`}>
              TOTAL: {complaints.length}
            </span>
            <span className="px-3 py-1.5 rounded-xl font-bold bg-red-500/15 text-red-500">
              HIGH: {complaints.filter(c => c.priority !== "ROUTINE").length}
            </span>
          </div>
        }
      />

      {/* Search + Filters */}
      <div className={`flex flex-wrap items-center gap-3 p-3 rounded-2xl mb-5 ${dark ? "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)]" : "bg-white border border-[#E2E8F0] shadow-sm"}`}>
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search ID, citizen, title..."
            className={`w-full pl-9 pr-3 py-2 rounded-xl text-[11px] font-mono focus:outline-none focus:ring-2 transition-all ${dark ? "bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-slate-200 placeholder-slate-500 focus:border-amber-400 focus:ring-amber-400/20" : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-[#2563EB]/15"}`} />
        </div>
        {[
          { val: statusF,   set: setStatusF,   opts: ["ALL","Pending","Under Review","Assigned","In Progress","Resolved","Rejected","Forwarded"] },
          { val: priorityF, set: setPriorityF, opts: ["ALL","CRITICAL","HIGH","ROUTINE"] },
          { val: categoryF, set: setCategoryF, opts: ["ALL","Cybercrime","Violence","Theft/Burglary","Traffic Incident","Harassment"] },
        ].map(({ val, set, opts }, i) => (
          <Select key={i} dark={dark} value={val} onChange={e => set(e.target.value)}
            className="py-1.5 text-[11px] font-mono">
            {opts.map(o => <option key={o} value={o}>{o}</option>)}
          </Select>
        ))}
      </div>

      {/* Main split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Queue — 5 cols */}
        <div className="lg:col-span-5">
          <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="none">
            <div className={`px-4 py-3 flex items-center justify-between border-b text-[11px] font-mono ${dark ? "border-[rgba(255,255,255,0.07)] text-slate-400" : "border-[#E2E8F0] text-[#475569]"}`}>
              <span className="font-black">DISPATCH QUEUE ({filtered.length})</span>
              <span>PRIORITY ORDER</span>
            </div>
            <div className="divide-y max-h-[700px] overflow-y-auto" style={{ divideColor: dark ? "rgba(255,255,255,0.05)" : "#F1F5F9" }}>
              {filtered.length === 0
                ? <p className={`p-6 text-center text-xs ${sub}`}>No matching cases.</p>
                : filtered.map(c => {
                  const isSelected = selected?.id === c.id;
                  return (
                    <div key={c.id} onClick={() => setSelected(c)}
                      className={`p-4 cursor-pointer space-y-1.5 transition-all ${isSelected
                        ? dark ? "bg-[rgba(212,175,55,0.07)] border-l-4 border-l-amber-400" : "bg-blue-50/60 border-l-4 border-l-[#163A70]"
                        : dark ? "hover:bg-[rgba(255,255,255,0.04)]" : "hover:bg-[#F8FAFC]"}`}>
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-[11px] font-mono ${dark ? "text-amber-400" : "text-[#163A70]"}`}>{c.id}</span>
                        <div className="flex items-center space-x-1.5">
                          <StatusBadge label={c.priority} type={c.priority === "CRITICAL" ? "critical" : c.priority === "HIGH" ? "high" : "routine"} />
                          <StatusBadge label={c.status}   type="neutral" />
                        </div>
                      </div>
                      <p className={`font-bold text-xs leading-snug ${txt}`}>{c.title}</p>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className={sub}>{c.crimeCategory}</span>
                        <span className={sub}>{c.citizenName}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Detail panel — 7 cols */}
        {selected ? (
          <div className="lg:col-span-7 space-y-4 max-h-[700px] overflow-y-auto pr-1">

            {/* Header */}
            <Card variant={dark ? "elevated" : "elevated"} dark={dark} padding="md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`font-black text-lg font-mono ${dark ? "text-amber-400" : "text-[#163A70]"}`}>{selected.id}</span>
                    <StatusBadge label={selected.priority} type={selected.priority === "CRITICAL" ? "critical" : "high"} />
                    <StatusBadge label={selected.status}   type="neutral" />
                  </div>
                  <h2 className={`font-black text-sm ${txt}`}>{selected.title}</h2>
                </div>
                <div className={`text-right text-[10px] font-mono ${sub}`}>
                  <span>FILED: {new Date(selected.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Metadata */}
            <Card variant={dark ? "elevated" : "default"} dark={dark} padding="md">
              <div className="grid grid-cols-3 gap-3 text-xs">
                {[
                  { label: "Citizen",  val: selected.citizenName, sub2: selected.citizenPhone },
                  { label: "Location", val: selected.district,    sub2: selected.address },
                  { label: "Officer",  val: selected.assignedOfficerName ?? "UNASSIGNED", sub2: "" },
                ].map(f => (
                  <div key={f.label}>
                    <p className={`text-[10px] font-mono font-bold uppercase mb-1 ${sub}`}>{f.label}</p>
                    <p className={`font-bold ${txt}`}>{f.val}</p>
                    {f.sub2 && <p className={`text-[11px] ${sub}`}>{f.sub2}</p>}
                  </div>
                ))}
              </div>
            </Card>

            {/* Map */}
            <Card variant={dark ? "elevated" : "default"} dark={dark} padding="md">
              <SectionHeader dark={dark} icon={<MapPin className="w-3.5 h-3.5 text-blue-500" />} title="Incident Location" />
              <div className="h-52 rounded-xl overflow-hidden">
                <GisMap complaints={[selected]} stations={stations} patrolUnits={patrolUnits}
                  initialLat={selected.latitude} initialLng={selected.longitude} />
              </div>
            </Card>

            {/* AI Triage */}
            <Card variant="gold" dark={dark} padding="md">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className={`text-[11px] font-black uppercase tracking-wider ${dark ? "text-amber-300" : "text-amber-800"}`}>
                  SENTINEL AI ASSESSMENT · {selected.aiAnalysis.confidenceScore}% Confidence
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                {[
                  { label: "Fake Prob",  val: `${selected.aiAnalysis.fakeProbability}%` },
                  { label: "Duplicate", val: selected.aiAnalysis.isDuplicate ? "YES" : "NO" },
                  { label: "Specialty", val: selected.aiAnalysis.recommendedOfficerSpecialty ?? "General" },
                  { label: "Response",  val: selected.aiAnalysis.estimatedResponseTime },
                ].map(m => (
                  <div key={m.label} className={`p-2.5 rounded-xl text-xs ${dark ? "bg-[rgba(0,0,0,0.3)] border border-[rgba(255,255,255,0.07)]" : "bg-white border border-amber-200/60"}`}>
                    <p className={`text-[10px] font-mono ${sub}`}>{m.label}</p>
                    <p className={`font-black ${txt}`}>{m.val}</p>
                  </div>
                ))}
              </div>
              {selected.aiAnalysis.ipcSections?.length && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {selected.aiAnalysis.ipcSections.map((s, i) => (
                    <span key={i} className="bg-[#163A70] text-white text-[9px] font-mono font-black px-2 py-0.5 rounded">{s}</span>
                  ))}
                </div>
              )}
              <p className={`text-xs leading-relaxed ${dark ? "text-slate-300" : "text-slate-700"}`}>
                <b>Action: </b>{selected.aiAnalysis.suggestedAction}
              </p>
            </Card>

            {/* Dispatch controls */}
            <Card variant={dark ? "elevated" : "default"} dark={dark} padding="md">
              <SectionHeader dark={dark} title="Dispatch & Status Update" />
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Select dark={dark} label="Assign Officer" value={officer} onChange={e => setOfficer(e.target.value)}>
                  <option value="OFF-101">Inspector C. Sterling (IND-POL-8841)</option>
                  <option value="OFF-102">Sub-Inspector P. Sharma (Cyber Cell)</option>
                  <option value="OFF-103">Inspector R. Verma (Northern)</option>
                </Select>
                <Select dark={dark} label="Update Status" value={newStatus} onChange={e => setNewStatus(e.target.value as ComplaintStatus)}>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Forwarded">Forwarded</option>
                </Select>
              </div>
              <Textarea dark={dark} label="Officer Log Note" value={note} onChange={e => setNote(e.target.value)}
                rows={2} placeholder="Tactical note, dispatch update, evidence collected..." />
              <div className="flex justify-end gap-2 mt-3">
                <Button variant="ghost" size="sm" onClick={addNote} disabled={submitting || !note.trim()}>Record Note</Button>
                <Button variant="primary" size="sm" icon={<UserCheck className="w-3.5 h-3.5" />} loading={submitting} onClick={updateCase}>
                  Update & Dispatch
                </Button>
              </div>
            </Card>

            {/* Timeline */}
            <Card variant={dark ? "elevated" : "default"} dark={dark} padding="md">
              <SectionHeader dark={dark} title="Audit Timeline" />
              <div className="border-l-2 border-[#163A70] pl-4 space-y-4">
                {selected.timeline.map(evt => (
                  <div key={evt.id} className="relative text-xs">
                    <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#163A70] border-2 border-white dark:border-[#0B1A2F]" />
                    <div className="flex justify-between">
                      <span className={`font-black ${txt}`}>{evt.status}</span>
                      <span className={`font-mono text-[10px] ${sub}`}>{evt.timestamp}</span>
                    </div>
                    <p className={`${sub} mt-0.5`}>{evt.message}</p>
                    <p className={`text-[10px] font-mono ${sub} opacity-70`}>Actor: {evt.actor}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="lg:col-span-7 flex items-center justify-center h-64">
            <p className={`text-xs ${sub}`}>Select a case from the queue.</p>
          </div>
        )}
      </div>
    </PageShell>
  );
};
