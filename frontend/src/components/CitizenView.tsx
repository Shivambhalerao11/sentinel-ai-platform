import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Radio,
  FilePlus,
  Search,
  History,
  MessageSquare,
  MapPin,
  Camera,
  Video,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UploadCloud,
  Send,
  PhoneCall,
  Sparkles,
  Bot,
  User,
  Phone,
  Mail,
  ShieldCheck,
  ChevronRight,
  FileText,
  Printer,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Complaint, CrimeCategory } from "../types";
import { submitComplaint, fetchComplaints, sendChatbotMessage } from "../services/api";
import { Select } from "../design";
import { CitizenSettings } from "./CitizenSettings";

interface CitizenViewProps {
  activeSubTab: string;
  onTabChange: (tab: string) => void;
  onOpenSos: () => void;
  onSelectComplaintForTracking?: (id: string) => void;
}

export const CitizenView: React.FC<CitizenViewProps> = ({
  activeSubTab,
  onTabChange,
  onOpenSos,
}) => {
  // Form State
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    category: "Cybercrime" as CrimeCategory,
    title: "",
    description: "",
    latitude: 28.6139,
    longitude: 77.209,
    address: "Connaught Place, Central District, New Delhi",
    district: "Central District",
    isAnonymous: false,
    isEmergency: false,
    photos: [] as string[],
    videos: [] as string[],
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [submittedComplaint, setSubmittedComplaint] = useState<Complaint | null>(null);

  // Complaint Tracking State
  const [trackSearchId, setTrackSearchId] = useState("");
  const [trackedComplaint, setTrackedComplaint] = useState<Complaint | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  // History State
  const [historyComplaints, setHistoryComplaints] = useState<Complaint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState<
    { sender: "user" | "bot"; text: string; citations?: string[]; suggestedActions?: string[] }[]
  >([
    {
      sender: "bot",
      text: "Namaste! I am **Suraksha AI**, official legal and safety assistant for the Indian Police. How can I help you today? You can ask about BNS/IPC crime sections, filing complaints, or emergency helplines.",
      citations: ["Bharatiya Nyaya Sanhita (BNS) 2023", "Cyber Crime Helpline 1930", "ERSS 112"],
      suggestedActions: ["File a Cyber Crime Complaint", "Call Women Helpline 1091", "Check BNS Sections for Theft"],
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Load History
  useEffect(() => {
    if (activeSubTab === "history") {
      setHistoryLoading(true);
      fetchComplaints()
        .then((data) => setHistoryComplaints(data))
        .catch((err) => console.error(err))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeSubTab]);

  // Handle Form Submit
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert("Please provide complaint title and description.");
      return;
    }

    setFormSubmitting(true);
    try {
      const payload = {
        citizen_name: formData.name,
        citizen_phone: formData.phone,
        citizen_email: formData.email,
        crime_category: formData.category,
        title: formData.title,
        description: formData.description,
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        district: formData.district,
        is_anonymous: formData.isAnonymous,
        is_emergency: formData.isEmergency,
      };

      const result = await submitComplaint(payload);
      setSubmittedComplaint(result);
    } catch (err: any) {
      alert("Failed to lodge complaint: " + err.message);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Image Upload Handler
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setFormData((prev) => ({
            ...prev,
            photos: [...prev.photos, reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Tracking Search Submit
  const handleTrackSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!trackSearchId.trim()) return;

    setTrackLoading(true);
    setTrackError("");
    setTrackedComplaint(null);

    try {
      const all = await fetchComplaints({ search: trackSearchId.trim() });
      const found = all.find(
        (c) => c.id.toLowerCase() === trackSearchId.trim().toLowerCase()
      );
      if (found) {
        setTrackedComplaint(found);
      } else if (all.length > 0) {
        setTrackedComplaint(all[0]);
      } else {
        setTrackError(`No complaint found with ID "${trackSearchId}". Please verify Complaint ID.`);
      }
    } catch (err: any) {
      setTrackError("Error searching complaint: " + err.message);
    } finally {
      setTrackLoading(false);
    }
  };

  // Chatbot Send Message
  const handleChatSend = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg = { sender: "user" as const, text: textToSend };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await sendChatbotMessage(textToSend);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: res.text,
          citations: res.citations,
          suggestedActions: res.suggestedActions,
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "I apologize, but I experienced a momentary network issue. For immediate emergencies, please call **112** or tap Emergency SOS.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* CITIZEN LANDING / HOME */}
      {activeSubTab === "citizen_home" && (
        <div className="space-y-6">
          {/* Government Official Banner */}
          <div className="bg-[#163A70] text-white rounded-xl p-6 md:p-8 shadow-md relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 opacity-10 text-white pointer-events-none">
              <ShieldAlert className="w-80 h-80" />
            </div>
            <div className="relative z-10 max-w-2xl space-y-3">
              <div className="inline-flex items-center space-x-2 bg-yellow-400 text-slate-900 px-2.5 py-1 rounded font-extrabold text-[11px] font-mono-data tracking-wider uppercase">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>MINISTRY OF HOME AFFAIRS | NATIONAL SAFETY PORTAL</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Citizens Safety & Crime Reporting Portal
              </h1>
              <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
                Direct AI-assisted emergency dispatch and complaint registration for the Indian Police.
                Instant automated triage, real-time officer assignment, and transparent tracking.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={onOpenSos}
                  className="bg-[#DC2626] hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-extrabold text-xs flex items-center space-x-2 shadow-lg transition-all animate-emergency-pulse cursor-pointer uppercase"
                >
                  <Radio className="w-4 h-4 text-white" />
                  <span>EMERGENCY SOS (112)</span>
                </button>

                <button
                  onClick={() => onTabChange("report")}
                  className="bg-white text-[#163A70] hover:bg-slate-100 font-extrabold px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2 shadow-sm transition-all cursor-pointer uppercase"
                >
                  <FilePlus className="w-4 h-4 text-[#163A70]" />
                  <span>Lodge Official Complaint</span>
                </button>
              </div>
            </div>
          </div>

          {/* Core Citizen Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => onTabChange("report")}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-all">
                <FilePlus className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Report a Crime</h3>
              <p className="text-xs text-[#475569] mt-1 leading-normal">
                Submit details, photos, video evidence, or location coordinates. Anonymous reporting supported.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-[#2563EB] group-hover:translate-x-1 transition-all">
                <span>File Complaint</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div
              onClick={() => onTabChange("status")}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-[#16A34A] flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-all">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Track Complaint Status</h3>
              <p className="text-xs text-[#475569] mt-1 leading-normal">
                Check investigation updates, assigned officers, and AI analysis using your Complaint ID.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-[#16A34A] group-hover:translate-x-1 transition-all">
                <span>Track Progress</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>

            <div
              onClick={() => onTabChange("chatbot")}
              className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs hover:border-[#2563EB] hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold mb-3 group-hover:scale-105 transition-all">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-[#0F172A] text-sm">Suraksha AI Legal Assistant</h3>
              <p className="text-xs text-[#475569] mt-1 leading-normal">
                Ask about Indian laws (BNS / IPC), cyber safety protocols, and emergency guidance.
              </p>
              <div className="mt-3 flex items-center text-xs font-bold text-cyan-700 group-hover:translate-x-1 transition-all">
                <span>Chat with AI</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </div>
            </div>
          </div>

          {/* National Emergency Helplines Bar */}
          <div className="bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
            <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider mb-4 flex items-center space-x-2">
              <PhoneCall className="w-4 h-4 text-[#DC2626]" />
              <span>National Emergency Toll-Free Helplines</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono-data">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-red-800 uppercase">National Emergency (ERSS)</p>
                <p className="text-lg font-extrabold text-red-600 mt-1">112</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-blue-800 uppercase">National Cyber Crime</p>
                <p className="text-lg font-extrabold text-blue-600 mt-1">1930</p>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-purple-800 uppercase">Women Emergency Helpline</p>
                <p className="text-lg font-extrabold text-purple-600 mt-1">1091</p>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-amber-800 uppercase">Child Helpline</p>
                <p className="text-lg font-extrabold text-amber-600 mt-1">1098</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT REGISTRATION FORM */}
      {activeSubTab === "report" && (
        <div className="space-y-6">
          {submittedComplaint ? (
            /* Success Receipt Screen */
            <div className="bg-white border border-emerald-300 rounded-xl p-6 space-y-6 shadow-md max-w-3xl mx-auto">
              <div className="flex items-center space-x-3 text-emerald-700 border-b border-emerald-100 pb-4">
                <CheckCircle2 className="w-8 h-8 shrink-0 text-emerald-600" />
                <div>
                  <h2 className="text-lg font-extrabold text-[#0F172A]">Complaint Successfully Registered</h2>
                  <p className="text-xs text-[#475569]">
                    Your case has been logged in the Sentinel Operational Network. AI analysis completed.
                  </p>
                </div>
              </div>

              {/* ID Banner */}
              <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-wrap items-center justify-between gap-2 font-mono-data">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">GENERATED COMPLAINT ID</p>
                  <p className="text-xl font-extrabold text-amber-400">{submittedComplaint.id}</p>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(submittedComplaint.id);
                    alert("Complaint ID copied to clipboard!");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded text-slate-200 flex items-center space-x-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </button>
              </div>

              {/* AI Triage Card */}
              <div className="bg-[#163A70]/5 border border-[#163A70]/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-2 text-[#163A70] font-bold text-xs uppercase">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>SENTINEL AI TRIAGE & DISPATCH ASSESSMENT</span>
                </div>

                {submittedComplaint.aiAnalysis ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono-data">
                      <div className="bg-white p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10px] text-slate-500">CATEGORY</span>
                        <p className="font-bold text-[#0F172A]">{submittedComplaint.aiAnalysis.category}</p>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10px] text-slate-500">PRIORITY</span>
                        <p
                          className={`font-extrabold ${
                            submittedComplaint.aiAnalysis.priority === "CRITICAL"
                              ? "text-red-600"
                              : "text-amber-600"
                          }`}
                        >
                          {submittedComplaint.aiAnalysis.priority}
                        </p>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10px] text-slate-500">NEAREST STATION</span>
                        <p className="font-bold text-[#0F172A]">{submittedComplaint.aiAnalysis.nearestStation}</p>
                      </div>

                      <div className="bg-white p-2.5 rounded border border-[#E2E8F0]">
                        <span className="text-[10px] text-slate-500">ESTIMATED RESPONSE</span>
                        <p className="font-bold text-emerald-600">{submittedComplaint.aiAnalysis.estimatedResponseTime}</p>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded border border-[#E2E8F0] text-xs">
                      <p className="font-bold text-[#0F172A] mb-1">Suggested Police Response Action Plan:</p>
                      <p className="text-[#475569]">{submittedComplaint.aiAnalysis.suggestedAction}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 italic">AI triage is processing. Results will appear shortly.</p>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => {
                    setSubmittedComplaint(null);
                    setFormData((prev) => ({ ...prev, title: "", description: "" }));
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-[#0F172A] font-bold text-xs px-4 py-2 rounded cursor-pointer"
                >
                  Lodge Another Complaint
                </button>

                <button
                  onClick={() => {
                    setTrackSearchId(submittedComplaint.id);
                    setTrackedComplaint(submittedComplaint);
                    onTabChange("status");
                  }}
                  className="bg-[#163A70] text-white hover:bg-[#1E3A8A] font-bold text-xs px-4 py-2 rounded flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Track Investigation Status</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleReportSubmit} className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
              <div className="border-b border-[#E2E8F0] pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-[#0F172A] uppercase tracking-wide">
                    LODGE CRIME COMPLAINT & INCIDENT REPORT
                  </h2>
                  <p className="text-xs text-[#475569]">
                    Provide accurate information. AI will triage priority and route to nearest precinct.
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer bg-slate-100 px-2.5 py-1.5 rounded border border-slate-200">
                    <input
                      type="checkbox"
                      checked={formData.isAnonymous}
                      onChange={(e) => setFormData({ ...formData, isAnonymous: e.target.checked })}
                      className="rounded text-[#163A70]"
                    />
                    <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                    <span className="font-semibold text-slate-700">File Anonymously</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer bg-red-50 px-2.5 py-1.5 rounded border border-red-200">
                    <input
                      type="checkbox"
                      checked={formData.isEmergency}
                      onChange={(e) => setFormData({ ...formData, isEmergency: e.target.checked })}
                      className="rounded text-red-600"
                    />
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    <span className="font-bold text-red-700">Emergency Incident</span>
                  </label>
                </div>
              </div>

              {/* Section 1: Citizen Info */}
              {!formData.isAnonymous && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-[#163A70] uppercase font-mono-data">
                    1. CITIZEN CONTACT INFORMATION
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Full Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Phone Number *</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1 font-medium">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Crime Details */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#163A70] uppercase font-mono-data">
                  2. INCIDENT & CRIME CATEGORY DETAILS
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <Select
                    variant="light"
                    label="Crime Category *"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as CrimeCategory })}
                  >
                    <option value="Cybercrime">Cybercrime / Financial Fraud</option>
                    <option value="Violence">Violence / Physical Assault</option>
                    <option value="Theft/Burglary">Theft / Burglary / Robbery</option>
                    <option value="Traffic Incident">Traffic Collision / Hit & Run</option>
                    <option value="Harassment">Stalking / Harassment</option>
                    <option value="Fraud/Scam">Scam / Forgery</option>
                    <option value="Narcotics">Narcotics / Illegal Substances</option>
                    <option value="Domestic Escalation">Domestic Conflict</option>
                    <option value="Organized Crime">Organized Gang Activity</option>
                    <option value="Other">Other Incident</option>
                  </Select>

                  <div className="md:col-span-2">
                    <label className="block text-slate-600 mb-1 font-medium">Complaint Title / Summary *</label>
                    <input
                      type="text"
                      placeholder="e.g., Unauthorised bank deduction of Rs 50,000 via SMS link"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-slate-600 mb-1 font-medium">Comprehensive Incident Description *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe what happened, timeline, accused names or suspect details, loss amount, vehicle number plates, etc..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-900 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              {/* Section 3: Evidence Attachments */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[#163A70] uppercase font-mono-data">
                  3. PHOTO & VIDEO EVIDENCE ATTACHMENTS
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded border border-slate-300 flex items-center space-x-2 font-semibold text-slate-700">
                    <Camera className="w-4 h-4 text-[#163A70]" />
                    <span>Upload Photo Evidence</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>

                  {formData.photos.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {formData.photos.map((p, idx) => (
                        <img
                          key={idx}
                          src={p}
                          alt="preview"
                          className="w-12 h-12 object-cover rounded border border-slate-300"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Action */}
              <div className="border-t border-[#E2E8F0] pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="bg-[#163A70] hover:bg-[#1E3A8A] text-white px-6 py-2.5 rounded-lg font-extrabold text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer uppercase"
                >
                  {formSubmitting ? (
                    <span>REGISTERING COMPLAINT & RUNNING AI TRIAGE...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Lodge Complaint Officially</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TRACK COMPLAINT STATUS */}
      {activeSubTab === "status" && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-extrabold text-[#0F172A] uppercase tracking-wide flex items-center space-x-2">
              <Search className="w-5 h-5 text-[#2563EB]" />
              <span>COMPLAINT STATUS & INVESTIGATION TRACKER</span>
            </h2>

            <form onSubmit={handleTrackSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Complaint ID (e.g. CASE-2026-00124)..."
                value={trackSearchId}
                onChange={(e) => setTrackSearchId(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono-data focus:outline-none focus:border-[#2563EB]"
              />
              <button
                type="submit"
                disabled={trackLoading}
                className="bg-[#163A70] hover:bg-[#1E3A8A] text-white px-5 py-2 rounded text-xs font-bold uppercase cursor-pointer"
              >
                {trackLoading ? "SEARCHING..." : "SEARCH"}
              </button>
            </form>

            {trackError && <p className="text-xs text-red-600 font-semibold">{trackError}</p>}
          </div>

          {trackedComplaint && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-xs space-y-6 font-sans">
              {/* Case Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-extrabold text-[#163A70] font-mono-data">
                      {trackedComplaint.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono-data ${
                        trackedComplaint.status === "In Progress"
                          ? "bg-blue-100 text-blue-800"
                          : trackedComplaint.status === "Assigned"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {trackedComplaint.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F172A] mt-1">{trackedComplaint.title}</h3>
                </div>

                <div className="text-right text-xs font-mono-data">
                  <p className="text-slate-500">LODGED ON</p>
                  <p className="font-bold text-[#0F172A]">
                    {new Date(trackedComplaint.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Progress Stepper Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#163A70] uppercase font-mono-data">
                  INVESTIGATION PROGRESS TIMELINE
                </h4>

                <div className="border-l-2 border-[#163A70] pl-4 space-y-4">
                  {trackedComplaint.timeline.map((evt) => (
                    <div key={evt.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[#163A70] border-2 border-white"></div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#0F172A]">{evt.status}</span>
                        <span className="text-[10px] font-mono-data text-slate-500">{evt.timestamp}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{evt.message}</p>
                      <p className="text-[10px] text-slate-400 font-mono-data">Actor: {evt.actor}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Officer Notes */}
              {trackedComplaint.officerNotes.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-[#0F172A] uppercase font-mono-data">
                    OFFICER FIELD NOTES
                  </h4>

                  {trackedComplaint.officerNotes.map((note) => (
                    <div key={note.id} className="text-xs border-b border-slate-200 last:border-0 pb-2">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                        <span>{note.officerName} ({note.badgeNumber})</span>
                        <span className="font-mono-data text-slate-400">{note.timestamp}</span>
                      </div>
                      <p className="text-slate-600 mt-1">{note.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MY COMPLAINT HISTORY */}
      {activeSubTab === "history" && (
        <div className="space-y-4">
          <h2 className="text-base font-extrabold text-[#0F172A] uppercase tracking-wide">
            MY COMPLAINT HISTORY & LODGED REPORTS
          </h2>

          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] font-mono-data text-[#475569] uppercase">
                <tr>
                  <th className="p-3">Complaint ID</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {historyComplaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold font-mono-data text-[#163A70]">{c.id}</td>
                    <td className="p-3">{c.crimeCategory}</td>
                    <td className="p-3 font-medium text-[#0F172A]">{c.title}</td>
                    <td className="p-3 font-bold font-mono-data text-amber-600">{c.priority}</td>
                    <td className="p-3">
                      <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">
                        {c.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setTrackSearchId(c.id);
                          setTrackedComplaint(c);
                          onTabChange("status");
                        }}
                        className="text-[#2563EB] hover:underline font-bold text-xs cursor-pointer"
                      >
                        Track Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SURAKSHA AI CHATBOT */}
      {activeSubTab === "chatbot" && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-xs overflow-hidden h-[600px] flex flex-col max-w-4xl mx-auto">
          <div className="bg-[#163A70] text-white p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="w-6 h-6 text-cyan-300" />
              <div>
                <h3 className="font-extrabold text-sm uppercase">Suraksha AI Legal Assistant</h3>
                <p className="text-[11px] text-slate-300">Indian Police BNS/IPC Law & Safety Assistant</p>
              </div>
            </div>
            <span className="bg-cyan-400 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded font-mono-data">
              POWERED BY GEMINI 3.6
            </span>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#F8FAFC]">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xl p-3.5 rounded-xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#163A70] text-white rounded-br-none"
                      : "bg-white border border-slate-200 text-[#0F172A] rounded-bl-none shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.text}</p>

                  {m.citations && (
                    <div className="mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono-data">
                      <strong>References:</strong> {m.citations.join(" | ")}
                    </div>
                  )}

                  {m.suggestedActions && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                      {m.suggestedActions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleChatSend(act)}
                          className="bg-slate-100 hover:bg-slate-200 text-[#163A70] font-semibold text-[10px] px-2 py-1 rounded cursor-pointer"
                        >
                          {act}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 border-t border-[#E2E8F0] bg-white flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Ask Suraksha AI about IPC sections, reporting steps, or helplines..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#2563EB]"
            />
            <button
              onClick={() => handleChatSend()}
              disabled={chatLoading}
              className="bg-[#163A70] hover:bg-[#1E3A8A] text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center space-x-1"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}

      {/* CITIZEN SETTINGS */}
      {activeSubTab === "settings" && (
        <CitizenSettings
          currentUser={{
            id: "usr-cit-01",
            full_name: formData.name || "Rahul Kapoor",
            email: formData.email || "rahul.k@example.com",
            phone: formData.phone || "+91 98765 43210",
            role: "citizen",
          }}
        />
      )}
    </div>
  );
};
