import React, { useState } from "react";
import {
  User, Shield, Bell, Lock, Globe, Sun, Moon, PhoneCall, Info,
  CheckCircle2, AlertTriangle, KeyRound, Smartphone, Mail, ShieldCheck,
  LogOut, Download, Trash2, Plus, Edit2, ChevronRight, HelpCircle,
  Bug, ExternalLink, Camera, Eye, EyeOff, Save
} from "lucide-react";
import { User as UserType } from "../types";
import { PageShell } from "../design/PageShell";
import { Card, SectionHeader } from "../design/Card";
import { Input, Select } from "../design/Input";
import { useTheme } from "../context/ThemeContext";

interface CitizenSettingsProps {
  currentUser: UserType;
  onUpdateUser?: (updated: Partial<UserType>) => void;
}

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export const CitizenSettings: React.FC<CitizenSettingsProps> = ({ currentUser, onUpdateUser }) => {
  const { themeMode, setThemeMode } = useTheme();
  const dark = themeMode === "dark";

  const [activeSection, setActiveSection] = useState<
    "profile" | "security" | "notifications" | "privacy" | "language" | "theme" | "emergency" | "about"
  >("profile");

  // Profile State
  const [profileData, setProfileData] = useState({
    full_name: currentUser.full_name || "Rahul Kapoor",
    email: currentUser.email || "rahul.k@example.com",
    phone: currentUser.phone || "+91 98765 43210",
    gender: "Male",
    dob: "1994-08-15",
    address: "124, Parliament Street, Connaught Place",
    state: "Delhi",
    city: "New Delhi",
    pinCode: "110001",
    bloodGroup: "O+",
  });
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({ current: "", newPass: "", confirmPass: "" });
  const [passwordMsg, setPasswordMsg] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  // 2FA & Sessions
  const [twoFactor, setTwoFactor] = useState(true);
  const [sessions, setSessions] = useState([
    { id: "s1", device: "Chrome / Windows 11 (Current Device)", ip: "103.21.124.8", lastActive: "Just now", current: true },
    { id: "s2", device: "Sentinel Mobile App / iOS 17", ip: "49.207.55.12", lastActive: "2 hours ago", current: false },
    { id: "s3", device: "Firefox / macOS Sonoma", ip: "115.240.90.3", lastActive: "Yesterday", current: false },
  ]);

  // Notifications State
  const [notifications, setNotifications] = useState({
    complaintUpdates: true,
    investigationUpdates: true,
    emailAlerts: true,
    smsAlerts: true,
    emergencyAlerts: true,
    sosAlerts: true,
  });

  // Privacy State
  const [privacy, setPrivacy] = useState({
    hidePersonalDetails: false,
    allowAnonymous: true,
    locationSharing: true,
  });

  // Language & Theme State
  const [selectedLanguage, setSelectedLanguage] = useState("English");

  // Emergency Contacts State
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: "c1", name: "Sunita Kapoor", relationship: "Mother", phone: "+91 98112 34567", isPrimary: true },
    { id: "c2", name: "Vikram Kapoor", relationship: "Brother", phone: "+91 98765 00000", isPrimary: false },
  ]);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", relationship: "Family", phone: "", isPrimary: false });

  // About Modal States
  const [modalType, setModalType] = useState<"terms" | "privacyPolicy" | "bugReport" | null>(null);
  const [bugDescription, setBugDescription] = useState("");
  const [bugSubmitted, setBugSubmitted] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateUser) {
      onUpdateUser({ full_name: profileData.full_name, email: profileData.email });
    }
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPass !== passwordForm.confirmPass) {
      setPasswordMsg("New passwords do not match!");
      return;
    }
    if (passwordForm.newPass.length < 8) {
      setPasswordMsg("Password must be at least 8 characters long.");
      return;
    }
    setPasswordMsg("Password updated successfully!");
    setPasswordForm({ current: "", newPass: "", confirmPass: "" });
    setTimeout(() => setPasswordMsg(""), 3000);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    const added: EmergencyContact = {
      id: "c_" + Date.now(),
      name: newContact.name,
      relationship: newContact.relationship,
      phone: newContact.phone,
      isPrimary: newContact.isPrimary,
    };
    if (newContact.isPrimary) {
      setContacts(prev => prev.map(c => ({ ...c, isPrimary: false })).concat(added));
    } else {
      setContacts(prev => [...prev, added]);
    }
    setShowAddContactModal(false);
    setNewContact({ name: "", relationship: "Family", phone: "", isPrimary: false });
  };

  const handleDeleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      user: profileData,
      notifications,
      privacy,
      emergencyContacts: contacts,
      exportedAt: new Date().toISOString(),
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sentinel_citizen_data_${currentUser.id || "profile"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const sections = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Lock },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy", icon: ShieldCheck },
    { id: "language", label: "Language", icon: Globe },
    { id: "theme", label: "Theme", icon: Sun },
    { id: "emergency", label: "Emergency Contacts", icon: PhoneCall },
    { id: "about", label: "About Platform", icon: Info },
  ] as const;

  const txt = dark ? "text-white" : "text-[#0F172A]";
  const sub = dark ? "text-slate-400" : "text-[#475569]";

  return (
    <PageShell dark={dark} motifs>
      <SectionHeader
        dark={dark}
        icon={<User className={`w-5 h-5 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
        title="Account Settings & Preferences"
        subtitle="Manage your identity, security credentials, notification channels, privacy rules & emergency contacts."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-1">
          <Card dark={dark} padding="sm" className="space-y-1 sticky top-4">
            {sections.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id as any)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[48px] ${
                    isActive
                      ? dark
                        ? "bg-amber-400/15 text-amber-300 border border-amber-400/30"
                        : "bg-[#163A70] text-white shadow-md"
                      : dark
                        ? "text-slate-300 hover:bg-white/5 hover:text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? (dark ? "text-amber-400" : "text-white") : "text-slate-400"}`} />
                    <span>{s.label}</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </button>
              );
            })}
          </Card>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3 space-y-6">
          {/* 1. PROFILE */}
          {activeSection === "profile" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<User className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Personal Profile & Citizen Identity"
                subtitle="Your verified details used for legal FIR filing and dispatch."
              />

              {profileSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Profile details saved successfully!</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-5">
                {/* Avatar Banner */}
                <div className={`p-4 rounded-2xl flex items-center space-x-4 ${dark ? "bg-white/5 border border-white/10" : "bg-slate-50 border border-slate-200"}`}>
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                      {profileData.full_name.charAt(0)}
                    </div>
                    <button type="button" className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#163A70] text-white shadow-md hover:scale-105 transition-all">
                      <Camera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className={`font-black text-sm ${txt}`}>{profileData.full_name}</h3>
                    <p className={`text-xs font-mono ${sub}`}>{profileData.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                      VERIFIED CITIZEN (Aadhaar Linked)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input dark={dark} label="Full Name" value={profileData.full_name} onChange={e => setProfileData({...profileData, full_name: e.target.value})} required />
                  <Input dark={dark} label="Email Address" type="email" value={profileData.email} onChange={e => setProfileData({...profileData, email: e.target.value})} required />
                  <Input dark={dark} label="Mobile Phone" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} required />
                  
                  <Select dark={dark} label="Gender" value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value})}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other / Non-Binary</option>
                  </Select>

                  <Input dark={dark} label="Date of Birth" type="date" value={profileData.dob} onChange={e => setProfileData({...profileData, dob: e.target.value})} />
                  
                  <Select dark={dark} label="Blood Group (Optional)" value={profileData.bloodGroup} onChange={e => setProfileData({...profileData, bloodGroup: e.target.value})}>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Input dark={dark} label="Residential Address" value={profileData.address} onChange={e => setProfileData({...profileData, address: e.target.value})} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input dark={dark} label="State / UT" value={profileData.state} onChange={e => setProfileData({...profileData, state: e.target.value})} />
                    <Input dark={dark} label="City / District" value={profileData.city} onChange={e => setProfileData({...profileData, city: e.target.value})} />
                    <Input dark={dark} label="PIN Code" value={profileData.pinCode} onChange={e => setProfileData({...profileData, pinCode: e.target.value})} />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#163A70] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-md min-h-[48px]">
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* 2. SECURITY */}
          {activeSection === "security" && (
            <div className="space-y-6">
              <Card dark={dark} padding="md">
                <SectionHeader
                  dark={dark}
                  icon={<KeyRound className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                  title="Change Password"
                  subtitle="Ensure your account is protected with a strong, high-entropy password."
                />

                {passwordMsg && (
                  <div className={`mb-4 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 ${
                    passwordMsg.includes("successfully") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30"
                  }`}>
                    {passwordMsg.includes("successfully") ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{passwordMsg}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="relative">
                    <Input
                      dark={dark}
                      label="Current Password"
                      type={showCurrentPass ? "text" : "password"}
                      value={passwordForm.current}
                      onChange={e => setPasswordForm({...passwordForm, current: e.target.value})}
                      required
                    />
                    <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-200">
                      {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        dark={dark}
                        label="New Password"
                        type={showNewPass ? "text" : "password"}
                        value={passwordForm.newPass}
                        onChange={e => setPasswordForm({...passwordForm, newPass: e.target.value})}
                        required
                      />
                      <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-8 text-slate-400 hover:text-slate-200">
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Input
                      dark={dark}
                      label="Confirm New Password"
                      type="password"
                      value={passwordForm.confirmPass}
                      onChange={e => setPasswordForm({...passwordForm, confirmPass: e.target.value})}
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#163A70] text-white text-xs font-bold cursor-pointer transition-all min-h-[48px]">
                      Update Password
                    </button>
                  </div>
                </form>
              </Card>

              {/* 2FA & Active Sessions */}
              <Card dark={dark} padding="md">
                <SectionHeader
                  dark={dark}
                  icon={<ShieldCheck className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                  title="Two-Factor Authentication (2FA) & Active Sessions"
                />

                <div className="space-y-5 text-xs">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div>
                      <h4 className={`font-bold ${txt}`}>SMS & Email 2FA Code</h4>
                      <p className={sub}>Require a 6-digit OTP verification code on every new device login.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTwoFactor(!twoFactor)}
                      className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${twoFactor ? "bg-emerald-500" : "bg-slate-400"}`}
                    >
                      <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${twoFactor ? "right-0.5" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div>
                    <h4 className={`font-bold text-xs uppercase font-mono tracking-wider mb-3 ${sub}`}>Active Login Sessions</h4>
                    <div className="space-y-2">
                      {sessions.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                          <div className="flex items-center space-x-3">
                            <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                            <div>
                              <p className={`font-bold ${txt}`}>{s.device}</p>
                              <p className={`text-[10px] font-mono ${sub}`}>IP: {s.ip} &bull; {s.lastActive}</p>
                            </div>
                          </div>
                          {s.current ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">THIS DEVICE</span>
                          ) : (
                            <button
                              onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))}
                              className="text-red-400 hover:text-red-300 text-[11px] font-bold cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setSessions(prev => prev.filter(x => x.current))}
                      className="w-full py-2.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-bold text-xs cursor-pointer flex items-center justify-center space-x-2 transition-all min-h-[48px]"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout From All Other Devices</span>
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* 3. NOTIFICATION PREFERENCES */}
          {activeSection === "notifications" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<Bell className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Notification Channels & Alerts"
                subtitle="Customize instant push, SMS, and email dispatches for FIR status and emergency SOS."
              />

              <div className="space-y-4 text-xs">
                {[
                  { key: "complaintUpdates", label: "Complaint Status Updates", desc: "Receive immediate updates when an officer updates your filed complaint status." },
                  { key: "investigationUpdates", label: "Investigation Milestones", desc: "Get notified when investigation notes or evidence updates are logged." },
                  { key: "emailAlerts", label: "Email Notifications", desc: "Send official confirmation letters and digital FIR copies to your email." },
                  { key: "smsAlerts", label: "SMS Notifications", desc: "Receive critical SMS dispatches directly on your registered mobile number." },
                  { key: "emergencyAlerts", label: "Area Security & Emergency Alerts", desc: "Broadcast alerts regarding public safety warnings or criminal activity in your area." },
                  { key: "sosAlerts", label: "Rapid SOS Confirmation Alerts", desc: "Immediate SMS and push confirmation whenever an Emergency SOS is triggered." },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div className="pr-4">
                      <h4 className={`font-bold ${txt}`}>{item.label}</h4>
                      <p className={sub}>{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        notifications[item.key as keyof typeof notifications] ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        notifications[item.key as keyof typeof notifications] ? "right-0.5" : "left-0.5"
                      }`} />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 4. PRIVACY */}
          {activeSection === "privacy" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<ShieldCheck className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Data Privacy & Identity Protection"
                subtitle="Control how your personal information is shared with investigative units."
              />

              <div className="space-y-5 text-xs">
                {[
                  { key: "hidePersonalDetails", label: "Hide Personal Details in Public Records", desc: "Mask name and phone number on public dashboard case listings." },
                  { key: "allowAnonymous", label: "Allow Anonymous Complaint Filing", desc: "Optionally submit crime reports without embedding citizen identity credentials." },
                  { key: "locationSharing", label: "Real-time Location Sharing Permission", desc: "Allow automatic GPS location tagging during emergency SOS dispatch." },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div className="pr-4">
                      <h4 className={`font-bold ${txt}`}>{item.label}</h4>
                      <p className={sub}>{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrivacy(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                      className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                        privacy[item.key as keyof typeof privacy] ? "bg-emerald-500" : "bg-slate-400"
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                        privacy[item.key as keyof typeof privacy] ? "right-0.5" : "left-0.5"
                      }`} />
                    </button>
                  </div>
                ))}

                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <h4 className={`font-bold ${txt}`}>Download My Account Data</h4>
                    <p className={sub}>Export a copy of your filed complaints, profile details, and activity log in JSON format.</p>
                  </div>
                  <button
                    onClick={handleDownloadData}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center space-x-2 shrink-0 cursor-pointer transition-all min-h-[48px]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download JSON Export</span>
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* 5. LANGUAGE */}
          {activeSection === "language" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<Globe className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Regional Language & Localization"
                subtitle="Select your preferred official Indian language for interface and chatbot assistant."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: "English", native: "English (Official)" },
                  { name: "Hindi", native: "हिन्दी (Hindi)" },
                  { name: "Marathi", native: "मराठी (Marathi)" },
                  { name: "Tamil", native: "தமிழ் (Tamil)" },
                  { name: "Telugu", native: "తెలుగు (Telugu)" },
                  { name: "Kannada", native: "कन्नड (Kannada)" },
                  { name: "Malayalam", native: "മലയാളം (Malayalam)" },
                  { name: "Gujarati", native: "ગુજરાતી (Gujarati)" },
                  { name: "Punjabi", native: "ਪੰਜਾਬੀ (Punjabi)" },
                ].map(lang => (
                  <button
                    key={lang.name}
                    onClick={() => setSelectedLanguage(lang.name)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all min-h-[56px] flex items-center justify-between ${
                      selectedLanguage === lang.name
                        ? dark
                          ? "bg-amber-400/20 border-amber-400 text-amber-300 font-black shadow-lg"
                          : "bg-[#163A70] border-[#163A70] text-white font-black shadow-lg"
                        : dark
                          ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                          : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                    }`}
                  >
                    <div>
                      <p className="text-xs">{lang.native}</p>
                      <p className="text-[10px] opacity-75 font-mono">{lang.name}</p>
                    </div>
                    {selectedLanguage === lang.name && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* 6. THEME */}
          {activeSection === "theme" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<Sun className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Appearance & Color Theme"
                subtitle="Switch between high-contrast Dark mode, Light mode, or follow System preferences."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { mode: "light", label: "Light Mode", icon: Sun, desc: "Crisp slate backgrounds for daytime readability." },
                  { mode: "dark", label: "Dark Mode", icon: Moon, desc: "Deep navy graphite theme tailored for night operations." },
                  { mode: "system", label: "System Default", icon: Sun, desc: "Automatically match device operating system theme." },
                ].map(t => {
                  const Icon = t.icon;
                  const isSelected = themeMode === t.mode || (t.mode === "system" && false);
                  return (
                    <button
                      key={t.mode}
                      onClick={() => setThemeMode(t.mode as "light" | "dark")}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all min-h-[80px] ${
                        isSelected
                          ? dark
                            ? "bg-amber-400/20 border-amber-400 text-amber-300 font-black shadow-lg"
                            : "bg-[#163A70] border-[#163A70] text-white font-black shadow-lg"
                          : dark
                            ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                            : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2 text-amber-400" />
                      <h4 className="text-xs font-bold">{t.label}</h4>
                      <p className="text-[10px] opacity-75 mt-1">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* 7. EMERGENCY CONTACTS */}
          {activeSection === "emergency" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<PhoneCall className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="Emergency SOS Contacts"
                subtitle="Contacts automatically notified with your GPS location when Rapid SOS is triggered."
                action={
                  <button
                    onClick={() => setShowAddContactModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Contact</span>
                  </button>
                }
              />

              <div className="space-y-3">
                {contacts.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-400 font-bold">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className={`font-bold text-xs ${txt}`}>{c.name}</h4>
                          {c.isPrimary && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded bg-red-500 text-white font-mono uppercase">
                              PRIMARY EMERGENCY CONTACT
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-mono ${sub}`}>{c.relationship} &bull; {c.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDeleteContact(c.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 cursor-pointer"
                        title="Delete contact"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Contact Modal */}
              {showAddContactModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${dark ? "bg-[#0B172A] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    <h3 className="text-base font-black uppercase mb-4">Add Emergency Contact</h3>
                    <form onSubmit={handleAddContact} className="space-y-4 text-xs">
                      <Input dark={dark} label="Full Name" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} required />
                      <Input dark={dark} label="Relationship (e.g. Spouse, Parent, Friend)" value={newContact.relationship} onChange={e => setNewContact({...newContact, relationship: e.target.value})} required />
                      <Input dark={dark} label="Phone Number" value={newContact.phone} onChange={e => setNewContact({...newContact, phone: e.target.value})} required />
                      
                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="checkbox"
                          id="isPrimary"
                          checked={newContact.isPrimary}
                          onChange={e => setNewContact({...newContact, isPrimary: e.target.checked})}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                        />
                        <label htmlFor="isPrimary" className={`text-xs ${sub}`}>Set as Primary Emergency Contact</label>
                      </div>

                      <div className="flex justify-end space-x-3 pt-3">
                        <button type="button" onClick={() => setShowAddContactModal(false)} className="px-4 py-2 rounded-xl bg-slate-500/20 text-slate-300 font-bold cursor-pointer">
                          Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                          Save Contact
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* 8. ABOUT PLATFORM */}
          {activeSection === "about" && (
            <Card dark={dark} padding="md">
              <SectionHeader
                dark={dark}
                icon={<Info className={`w-4 h-4 ${dark ? "text-amber-400" : "text-[#163A70]"}`} />}
                title="About Sentinel Platform"
                subtitle="National AI Crime Intelligence & Public Safety Network."
              />

              <div className="space-y-4 text-xs">
                <div className={`p-4 rounded-xl border ${dark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"}`}>
                  <h4 className={`font-black text-sm ${txt}`}>Sentinel AI Crime Intelligence Platform</h4>
                  <p className={`text-xs mt-1 ${sub}`}>Version 2.4.0 (Enterprise Hackathon Edition)</p>
                  <p className={`text-xs mt-2 leading-relaxed ${sub}`}>
                    Built for Indian Law Enforcement & Citizens. Powered by Bharatiya Nyaya Sanhita (BNS 2023) legal mapping, Gemini AI threat analysis, and real-time GIS dispatch.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Terms of Service", action: () => setModalType("terms") },
                    { label: "Privacy Policy", action: () => setModalType("privacyPolicy") },
                    { label: "Help Center & FAQs", action: () => alert("Sentinel Support Desk: 1800-11-SENTINEL") },
                    { label: "Report a Technical Bug", action: () => setModalType("bugReport") },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between ${
                        dark ? "bg-white/5 border-white/10 hover:bg-white/10 text-slate-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                      }`}
                    >
                      <span className="font-bold">{item.label}</span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Modals */}
              {modalType && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className={`w-full max-w-lg p-6 rounded-2xl border shadow-2xl max-h-[80vh] overflow-y-auto ${dark ? "bg-[#0B172A] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"}`}>
                    {modalType === "terms" && (
                      <div>
                        <h3 className="text-base font-black uppercase mb-3">Terms of Service</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          Sentinel AI is authorized under Ministry of Home Affairs framework. False complaints are punishable under BNS Section 217.
                        </p>
                      </div>
                    )}
                    {modalType === "privacyPolicy" && (
                      <div>
                        <h3 className="text-base font-black uppercase mb-3">Privacy Policy</h3>
                        <p className="text-xs text-slate-400 leading-relaxed mb-4">
                          Citizen data is encrypted using AES-256 and stored in compliance with the Digital Personal Data Protection (DPDP) Act 2023.
                        </p>
                      </div>
                    )}
                    {modalType === "bugReport" && (
                      <div>
                        <h3 className="text-base font-black uppercase mb-3">Report Technical Bug</h3>
                        {bugSubmitted ? (
                          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold mb-4">
                            Bug report submitted successfully! Thank you for helping improve Sentinel.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <textarea
                              rows={4}
                              value={bugDescription}
                              onChange={e => setBugDescription(e.target.value)}
                              placeholder="Describe the issue or error encountered..."
                              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs focus:outline-none"
                            />
                            <button
                              onClick={() => { setBugSubmitted(true); setTimeout(() => { setBugSubmitted(false); setModalType(null); }, 2000); }}
                              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
                            >
                              Submit Report
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end pt-3">
                      <button onClick={() => setModalType(null)} className="px-4 py-2 rounded-xl bg-slate-500/20 font-bold text-xs cursor-pointer">
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
};
