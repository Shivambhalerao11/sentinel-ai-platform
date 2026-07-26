/**
 * AuthScreen — Fixed for focus retention.
 *
 * ROOT CAUSE OF BUG:
 * Shell, ErrorBanner, TabBar, SubmitBtn, CitizenPanel, PolicePanel, PortalSelectPanel
 * were all defined INSIDE the AuthScreen function body.
 * React treats them as NEW component types on every render (every keystroke).
 * This causes full unmount + remount of every input, losing focus after each character.
 *
 * FIX: All sub-components moved OUTSIDE the parent function.
 * They receive props instead of closing over state.
 * React now recognises them as stable component types — no remounting.
 */
import React, { useState, memo } from "react";
import {
  Mail, KeyRound, FileCheck, User as UserIcon, BadgeAlert,
  ArrowRight, Shield, Radio, Sparkles, UserPlus, LogIn,
  ArrowLeft, Check, Lock, Sun, Moon,
} from "lucide-react";
import { User, UserRole } from "../types";
import {
  loginUser, registerUser, sendEmailOtp, verifyEmailOtp,
  registerPoliceOfficer, resetPasswordWithOtp,
} from "../services/api";
import { Select } from "../design";
import { useTheme } from "../context/ThemeContext";
import { OtpVerificationModal } from "./OtpVerificationModal";

// ─── Shared style constants ──────────────────────────────────────────────────
// INPUT applies to both <input> and <select> elements.
// Explicit text-white, caret gold, selection blue, placeholder light-grey.
const INPUT =
  "w-full rounded-xl px-3 py-2.5 text-xs font-medium focus:outline-none transition-all duration-200 ds-input caret-[#D4AF37] text-white placeholder-[#BFC7D5] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/25 selection:bg-[#163A70] selection:text-white";
const LABEL = "block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider";

// ─── Shell — stable, defined OUTSIDE parent ──────────────────────────────────
const Shell: React.FC<{ children: React.ReactNode }> = memo(({ children }) => {
  const { themeMode, toggleTheme } = useTheme();
  const isDark = themeMode === "dark";

  return (
    <div
      className="min-h-screen flex flex-col font-sans relative"
      style={{ background: isDark ? "linear-gradient(160deg,#000810 0%,#020d1f 60%,#000810 100%)" : "radial-gradient(ellipse 80% 50% at 50% 0%, #EEF3FF 0%, #F8FAFC 60%, #F1F5F9 100%)" }}
    >
      {/* Background grid — fixed so it doesn't affect layout/scroll */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(20,184,166,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.5) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
      {/* Sticky header — stays visible while form scrolls */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3 border-b shrink-0"
        style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)", background: isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center space-x-3">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-[10px] tracking-[0.35em] uppercase text-amber-400 font-bold">Government of India</span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className={`${isDark ? "text-slate-400" : "text-slate-600"} font-mono text-[10px] hidden sm:inline`}>Ministry of Home Affairs</span>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase">Secure TLS 1.3</span>
          </div>

          {/* Top-Right Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono transition-all cursor-pointer shadow-sm ${
              isDark
                ? "bg-[rgba(255,255,255,0.08)] border-[rgba(212,175,55,0.3)] text-amber-300 hover:bg-[rgba(255,255,255,0.15)]"
                : "bg-white border-[#163A70]/20 text-[#163A70] hover:bg-slate-100"
            }`}
            title={`Switch to ${isDark ? "Light Mode" : "Dark Mode"}`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-bold">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#163A70]" />
                <span className="hidden sm:inline font-bold">Dark</span>
              </>
            )}
          </button>
        </div>
      </div>
      {/* Content area — grows with content, allows page-level scroll */}
      <div className="relative z-10 flex-1 flex items-start justify-center p-4 sm:p-6 md:p-10 py-8">
        <div className="w-full flex justify-center">{children}</div>
      </div>
      <footer className="relative z-10 text-center py-3 font-mono text-[9px] tracking-widest uppercase shrink-0"
        style={{ color: isDark ? "rgba(71,85,105,0.6)" : "rgba(71,85,105,0.8)", borderTop: isDark ? "1px solid rgba(255,255,255,0.04)" : "1px solid rgba(0,0,0,0.06)" }}>
        BNS 2023 Compliant · ISO 27001 Infrastructure · NIC Certified
      </footer>
    </div>
  );
});
Shell.displayName = "Shell";

// ─── ErrorBanner — stable, defined OUTSIDE parent ────────────────────────────
const ErrorBanner: React.FC<{ message: string }> = memo(({ message }) =>
  message ? (
    <div className="mb-4 p-3 rounded-xl flex items-start space-x-2 text-xs"
      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
      <BadgeAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
      <span className="text-red-300 font-medium">{message}</span>
    </div>
  ) : null
);
ErrorBanner.displayName = "ErrorBanner";

// ─── TabBar — stable, defined OUTSIDE parent ─────────────────────────────────
interface TabBarProps {
  active: "login" | "register";
  onLogin: () => void;
  onRegister: () => void;
  variant: "citizen" | "police";
}
const TabBar: React.FC<TabBarProps> = memo(({ active, onLogin, onRegister, variant }) => {
  const accent = variant === "citizen" ? "rgba(59,130,246,1)" : "rgba(212,175,55,1)";
  return (
    <div className="flex rounded-xl mb-5 p-1 gap-1"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      {([
        { id: "login",    icon: <LogIn    className="w-3.5 h-3.5" />, label: "Sign In" },
        { id: "register", icon: <UserPlus className="w-3.5 h-3.5" />, label: variant === "citizen" ? "Register" : "New Officer" },
      ] as const).map(({ id, icon, label }) => (
        <button key={id} type="button"
          onClick={id === "login" ? onLogin : onRegister}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
          style={active === id
            ? { background: variant === "citizen" ? "rgba(37,99,235,0.2)" : "rgba(212,175,55,0.12)", color: accent, border: `1px solid ${variant === "citizen" ? "rgba(59,130,246,0.3)" : "rgba(212,175,55,0.3)"}` }
            : { color: "rgba(100,116,139,0.8)", border: "1px solid transparent" }}>
          {icon}<span>{label}</span>
        </button>
      ))}
    </div>
  );
});
TabBar.displayName = "TabBar";

// ─── SubmitBtn — stable, defined OUTSIDE parent ──────────────────────────────
interface SubmitBtnProps { label: string; isLoading: boolean; variant?: "citizen" | "police" | "emerald"; }
const SubmitBtn: React.FC<SubmitBtnProps> = memo(({ label, isLoading, variant = "citizen" }) => {
  const bg     = variant === "police" ? "linear-gradient(135deg,#92400e,#d97706,#D4AF37)" : variant === "emerald" ? "linear-gradient(135deg,#065f46,#059669)" : "linear-gradient(135deg,#1d4ed8,#2563eb)";
  const shadow = variant === "police" ? "0 4px 20px rgba(212,175,55,0.25)" : variant === "emerald" ? "0 4px 20px rgba(5,150,105,0.25)" : "0 4px 20px rgba(37,99,235,0.25)";
  return (
    <button type="submit" disabled={isLoading}
      className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
      style={{ background: bg, color: variant === "police" ? "#000" : "#fff", boxShadow: shadow }}>
      {isLoading ? <span className="animate-pulse">Authenticating...</span> : <><span>{label}</span><ArrowRight className="w-4 h-4" /></>}
    </button>
  );
});
SubmitBtn.displayName = "SubmitBtn";

// ─── CitizenLoginForm — stable, defined OUTSIDE parent ───────────────────────
interface CitizenLoginProps {
  identifier: string; setIdentifier: (v: string) => void;
  password: string;   setPassword:   (v: string) => void;
  rememberMe: boolean; setRememberMe: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgot: () => void;
  onDemo:   () => void;
  loading:  boolean;
}
const CitizenLoginForm: React.FC<CitizenLoginProps> = memo(({
  identifier, setIdentifier, password, setPassword,
  rememberMe, setRememberMe, onSubmit, onForgot, onDemo, loading,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <label className={LABEL}>Email or Mobile</label>
      <div className="relative">
        <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)}
          placeholder="email@domain.com or +91 98765 43210" className={INPUT + " pl-9"} />
      </div>
    </div>
    <div>
      <label className={LABEL}>Password</label>
      <div className="relative">
        <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••••••" className={INPUT + " pl-9"} />
      </div>
    </div>
    <div className="flex items-center justify-between text-xs">
      <label className="flex items-center space-x-2 text-slate-500 cursor-pointer">
        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
          className="rounded border-white/10 bg-white/5 text-blue-500" />
        <span>Remember Me</span>
      </label>
      <button type="button" onClick={onForgot}
        className="text-blue-400/70 hover:text-blue-300 cursor-pointer text-[11px] font-mono">
        Forgot Password?
      </button>
    </div>
    <SubmitBtn label="Sign In to Citizen Dashboard" isLoading={loading} variant="citizen" />
    <p className="text-center pt-1">
      <button type="button" onClick={onDemo}
        className="text-[11px] text-slate-500 hover:text-blue-400 underline cursor-pointer font-mono">
        Quick demo (Citizen)
      </button>
    </p>
  </form>
));
CitizenLoginForm.displayName = "CitizenLoginForm";

// ─── CitizenRegisterForm — stable, defined OUTSIDE parent ────────────────────
interface CitizenRegisterProps {
  fullName: string; setFullName: (v: string) => void;
  email: string;    setEmail:    (v: string) => void;
  mobile: string;   setMobile:   (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  address: string;  setAddress:  (v: string) => void;
  state: string;    setState:    (v: string) => void;
  city: string;     setCity:     (v: string) => void;
  pinCode: string;  setPinCode:  (v: string) => void;
  citizenId: string; setCitizenId: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading:  boolean;
}
const CitizenRegisterForm: React.FC<CitizenRegisterProps> = memo(({
  fullName, setFullName, email, setEmail, mobile, setMobile,
  password, setPassword, confirmPassword, setConfirmPassword,
  address, setAddress, state, setState, city, setCity,
  pinCode, setPinCode, citizenId, setCitizenId, onSubmit, loading,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <div>
      <label className={LABEL}>Full Name *</label>
      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
        placeholder="e.g. Priya Sharma" className={INPUT} />
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      <div>
        <label className={LABEL}>Email *</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="email@domain.com" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Mobile *</label>
        <input type="text" required value={mobile} onChange={e => setMobile(e.target.value)}
          placeholder="+91 98765 00000" className={INPUT} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2.5">
      <div>
        <label className={LABEL}>Password *</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Min 8 chars, A-Z, 0-9" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Confirm *</label>
        <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••••••" className={INPUT} />
      </div>
    </div>
    <div>
      <label className={LABEL}>Address</label>
      <input type="text" value={address} onChange={e => setAddress(e.target.value)}
        placeholder="House No, Street, Locality" className={INPUT} />
    </div>
    <div className="grid grid-cols-3 gap-2">
      <div>
        <label className={LABEL}>State</label>
        <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="Delhi" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>City</label>
        <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="New Delhi" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>PIN</label>
        <input type="text" value={pinCode} onChange={e => setPinCode(e.target.value)} placeholder="110001" className={INPUT} />
      </div>
    </div>
    <div>
      <label className={LABEL}>Aadhaar / Citizen ID (Optional)</label>
      <input type="text" value={citizenId} onChange={e => setCitizenId(e.target.value)}
        placeholder="XXXX-XXXX-XXXX" className={INPUT} />
    </div>
    <p className="text-[10px] text-slate-600 font-mono">* Password must contain uppercase, lowercase, and a digit.</p>
    <SubmitBtn label="Create Account & Enter" isLoading={loading} variant="emerald" />
  </form>
));
CitizenRegisterForm.displayName = "CitizenRegisterForm";

// ─── PoliceLoginForm — stable, defined OUTSIDE parent ────────────────────────
interface PoliceLoginProps {
  employeeId: string; setEmployeeId: (v: string) => void;
  password: string;   setPassword:   (v: string) => void;
  department: string; setDepartment: (v: string) => void;
  station: string;    setStation:    (v: string) => void;
  rememberMe: boolean; setRememberMe: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onForgot: () => void;
  onDemo:   () => void;
  loading:  boolean;
}
const PoliceLoginForm: React.FC<PoliceLoginProps> = memo(({
  employeeId, setEmployeeId, password, setPassword,
  department, setDepartment, station, setStation,
  rememberMe, setRememberMe, onSubmit, onForgot, onDemo, loading,
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div>
      <label className={LABEL}>Employee ID / Official Email</label>
      <div className="relative">
        <FileCheck className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input type="text" required value={employeeId} onChange={e => setEmployeeId(e.target.value)}
          placeholder="IND-POL-8841 or email@delhipolice.gov.in" className={INPUT + " pl-9"} />
      </div>
    </div>
    <div>
      <label className={LABEL}>Password</label>
      <div className="relative">
        <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••••••" className={INPUT + " pl-9"} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Select
        dark
        label="Department"
        value={department}
        onChange={e => setDepartment(e.target.value)}
      >
        <option value="Crime Branch & AI Intelligence">Crime Branch & AI Unit</option>
        <option value="Cyber Crime Cell">Cyber Crime Cell</option>
        <option value="Special Operations Cell">Special Operations Cell</option>
        <option value="Traffic & Field Dispatch">Traffic & Field Dispatch</option>
      </Select>
      <Select
        dark
        label="Precinct"
        value={station}
        onChange={e => setStation(e.target.value)}
      >
        <option value="DEL-HQ-01">Precinct 01 – HQ Command</option>
        <option value="DEL-N-02">Northern Precinct</option>
        <option value="DEL-S-03">Southern Extension</option>
      </Select>
    </div>
    <div className="flex items-center justify-between text-xs">
      <label className="flex items-center space-x-2 text-slate-500 cursor-pointer">
        <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
          className="rounded border-white/10 bg-white/5 text-amber-500" />
        <span>Remember Me</span>
      </label>
      <button type="button" onClick={onForgot}
        className="text-amber-400/60 hover:text-amber-300 cursor-pointer text-[11px] font-mono">
        Forgot Password?
      </button>
    </div>
    <SubmitBtn label="Enter Police Command Center" isLoading={loading} variant="police" />
    <p className="text-center pt-1">
      <button type="button" onClick={onDemo}
        className="text-[11px] text-amber-400/50 hover:text-amber-300 underline cursor-pointer font-mono">
        Quick demo (Police Admin)
      </button>
    </p>
  </form>
));
PoliceLoginForm.displayName = "PoliceLoginForm";

// ─── PoliceRegisterForm — stable, defined OUTSIDE parent ───────────────────
interface PoliceRegisterProps {
  fullName: string; setFullName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  mobile: string; setMobile: (v: string) => void;
  employeeId: string; setEmployeeId: (v: string) => void;
  badgeNumber: string; setBadgeNumber: (v: string) => void;
  password: string; setPassword: (v: string) => void;
  confirmPassword: string; setConfirmPassword: (v: string) => void;
  rank: string; setRank: (v: string) => void;
  department: string; setDepartment: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
}
const PoliceRegisterForm: React.FC<PoliceRegisterProps> = memo(({
  fullName, setFullName, email, setEmail, mobile, setMobile,
  employeeId, setEmployeeId, badgeNumber, setBadgeNumber,
  password, setPassword, confirmPassword, setConfirmPassword,
  rank, setRank, department, setDepartment, onSubmit, loading,
}) => (
  <form onSubmit={onSubmit} className="space-y-3">
    <div>
      <label className={LABEL}>Full Legal Name *</label>
      <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
        placeholder="Officer Full Name" className={INPUT} />
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={LABEL}>Official Email *</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="officer@delhipolice.gov.in" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Mobile Number *</label>
        <input type="text" required value={mobile} onChange={e => setMobile(e.target.value)}
          placeholder="+91 98765 43210" className={INPUT} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={LABEL}>Employee ID *</label>
        <input type="text" required value={employeeId} onChange={e => setEmployeeId(e.target.value)}
          placeholder="IND-POL-8841" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Badge Number *</label>
        <input type="text" required value={badgeNumber} onChange={e => setBadgeNumber(e.target.value)}
          placeholder="DEL-8841" className={INPUT} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <Select dark label="Rank *" value={rank} onChange={e => setRank(e.target.value)}>
        <option value="Inspector">Inspector</option>
        <option value="Sub-Inspector">Sub-Inspector</option>
        <option value="Assistant Sub-Inspector">Assistant Sub-Inspector</option>
        <option value="Head Constable">Head Constable</option>
        <option value="Deputy Commissioner">Deputy Commissioner</option>
      </Select>
      <Select dark label="Department *" value={department} onChange={e => setDepartment(e.target.value)}>
        <option value="Crime Branch & AI Intelligence">Crime Branch & AI Unit</option>
        <option value="Cyber Crime Cell">Cyber Crime Cell</option>
        <option value="Special Operations Cell">Special Operations Cell</option>
        <option value="Traffic & Field Dispatch">Traffic & Field Dispatch</option>
      </Select>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className={LABEL}>Password *</label>
        <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
          placeholder="••••••••••••" className={INPUT} />
      </div>
      <div>
        <label className={LABEL}>Confirm Password *</label>
        <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
          placeholder="••••••••••••" className={INPUT} />
      </div>
    </div>
    <SubmitBtn label="Register Officer & Request OTP" isLoading={loading} variant="police" />
  </form>
));
PoliceRegisterForm.displayName = "PoliceRegisterForm";

// ─── ForgotModal — stable, defined OUTSIDE parent ────────────────────────────
const ForgotModal: React.FC<{ onClose: () => void }> = memo(({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>
    <div className="w-full max-w-md rounded-2xl p-6 space-y-4"
      style={{ background: "rgba(2,13,31,0.98)", border: "1px solid rgba(212,175,55,0.2)" }}>
      <div className="flex items-center space-x-3 pb-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <Shield className="w-5 h-5 text-amber-400" />
        <h3 className="font-bold text-white text-sm">Official Password Assistance</h3>
      </div>
      <div className="text-xs text-slate-400 leading-relaxed space-y-3">
        <p>
          <span className="text-slate-200 font-semibold">For Citizens:</span> Verify your email or phone number with our automated OTP recovery service, or email{" "}
          <code className="text-amber-400/80 font-mono">citizensupport@police.gov.in</code>
        </p>
        <p>
          <span className="text-slate-200 font-semibold">For Police Personnel:</span> Password resets require official verification by your Precinct Administrator.
          Contact IT Desk at{" "}
          <code className="text-amber-400/80 font-mono">it.admin@delhipolice.gov.in</code>
        </p>
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={onClose}
          className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(226,232,240,0.8)" }}>
          Close
        </button>
      </div>
    </div>
  </div>
));
ForgotModal.displayName = "ForgotModal";

// ─── PortalSelectPanel — stable, defined OUTSIDE parent ──────────────────────
interface PortalSelectProps {
  onCitizen: () => void;
  onPolice: () => void;
  onDemo: (role: UserRole) => void;
  loading: boolean;
}
const PortalSelectPanel: React.FC<PortalSelectProps> = memo(({ onCitizen, onPolice, onDemo, loading }) => (
  <div className="w-full max-w-3xl">
    <div className="text-center mb-10">
      <div className="flex items-center justify-center space-x-3 mb-3">
        <div className="h-px w-10 bg-gradient-to-r from-transparent to-amber-400/40" />
        <span className="font-black tracking-[0.4em] uppercase text-base"
          style={{ background: "linear-gradient(135deg,#D4AF37,#F5E27A,#D4AF37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          SENTINEL
        </span>
        <div className="h-px w-10 bg-gradient-to-l from-transparent to-amber-400/40" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Choose Your Portal</h1>
      <p className="text-slate-500 text-sm mt-2 font-light">Select your access tier to enter the National AI Crime Intelligence Network.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* Citizen */}
      <div className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", backdropFilter: "blur(16px)" }}
        onClick={onCitizen}>
        <div className="p-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-105"
            style={{ background: "rgba(37,99,235,0.15)", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 24px rgba(37,99,235,0.15)" }}>
            <UserIcon className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2 group-hover:text-blue-300 transition-colors">Citizen Portal</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-5 font-light">File complaints, track cases, request emergency dispatch, and access AI-powered legal guidance.</p>
          <ul className="space-y-2 mb-6">
            {["Instant e-FIR Filing", "GPS Emergency SOS", "Real-time Case Tracking"].map(f => (
              <li key={f} className="flex items-center space-x-2 text-xs text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /><span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all group-hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", color: "#fff", boxShadow: "0 4px 20px rgba(37,99,235,0.25)" }}>
            <span>Enter Citizen Portal</span><ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Police */}
      <div className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.12)", backdropFilter: "blur(16px)" }}
        onClick={onPolice}>
        <div className="p-7">
          <div className="inline-flex items-center space-x-1.5 mb-4 px-2.5 py-1 rounded-full"
            style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)" }}>
            <Lock className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 font-mono text-[9px] tracking-[0.2em] uppercase">Gov. Authorized Only</span>
          </div>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-105"
            style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", boxShadow: "0 0 24px rgba(212,175,55,0.12)" }}>
            <Shield className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-amber-300 mb-2 group-hover:text-amber-200 transition-colors">Police / Admin Portal</h2>
          <p className="text-slate-400 text-xs leading-relaxed mb-5 font-light">Restricted command access for authorized law enforcement and administrative personnel only.</p>
          <ul className="space-y-2 mb-6">
            {["Command & Dispatch", "AI Crime Triage", "GIS Tactical Map"].map(f => (
              <li key={f} className="flex items-center space-x-2 text-xs text-slate-400">
                <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" /><span>{f}</span>
              </li>
            ))}
          </ul>
          <div className="w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all group-hover:brightness-110"
            style={{ background: "linear-gradient(135deg,#92400e,#d97706,#D4AF37)", color: "#000", boxShadow: "0 4px 20px rgba(212,175,55,0.2)" }}>
            <span>Enter Command Center</span><ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>

    <div className="mt-8 flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-5">
      <span className="flex items-center space-x-1.5 text-xs font-mono" style={{ color: "rgba(100,116,139,0.6)" }}>
        <Sparkles className="w-3.5 h-3.5 text-amber-500/50" /><span>Instant demo access:</span>
      </span>
      <div className="flex items-center space-x-3">
        <button type="button" onClick={() => onDemo("citizen")} disabled={loading}
          className="px-4 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase cursor-pointer disabled:opacity-40"
          style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "rgba(147,197,253,0.8)" }}>
          {loading ? "Loading..." : "Citizen Demo"}
        </button>
        <button type="button" onClick={() => onDemo("police_admin")} disabled={loading}
          className="px-4 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wider uppercase cursor-pointer disabled:opacity-40"
          style={{ background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.2)", color: "rgba(212,175,55,0.8)" }}>
          {loading ? "Loading..." : "Police Demo"}
        </button>
      </div>
    </div>
  </div>
));
PortalSelectPanel.displayName = "PortalSelectPanel";

// ─── AuthScreen — thin orchestrator, holds state only ────────────────────────
// All child components are defined OUTSIDE this function so React never
// creates new component types on re-render. Inputs retain focus permanently.
interface AuthScreenProps {
  onLoginSuccess: (user: User) => void;
  initialStep?: "portal_select" | "citizen_auth" | "police_auth";
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  initialStep = "portal_select",
}) => {
  const [currentStep, setCurrentStep] = useState<"portal_select" | "citizen_auth" | "police_auth">(initialStep);
  const [citizenTab, setCitizenTab]   = useState<"login" | "register">("login");
  const [policeTab,  setPoliceTab]    = useState<"login" | "register">("login");
  const [loading, setLoading]         = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [rememberMe, setRememberMe]   = useState(true);
  const [showForgot, setShowForgot]   = useState(false);

  // Citizen Login
  const [citIdentifier, setCitIdentifier] = useState("");
  const [citPassword,   setCitPassword]   = useState("");

  // Citizen Register
  const [regFullName,        setRegFullName]        = useState("");
  const [regEmail,           setRegEmail]           = useState("");
  const [regMobile,          setRegMobile]          = useState("");
  const [regPassword,        setRegPassword]        = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regAddress,         setRegAddress]         = useState("");
  const [regState,           setRegState]           = useState("");
  const [regCity,            setRegCity]            = useState("");
  const [regPinCode,         setRegPinCode]         = useState("");
  const [regCitizenId,       setRegCitizenId]       = useState("");

  // Police Login & Direct Register
  const [polEmployeeId, setPolEmployeeId] = useState("");
  const [polPassword,   setPolPassword]   = useState("");
  const [polDepartment, setPolDepartment] = useState("Crime Branch & AI Intelligence");
  const [polStation,    setPolStation]    = useState("DEL-HQ-01");

  const [polFullName, setPolFullName] = useState("");
  const [polEmail, setPolEmail] = useState("");
  const [polMobile, setPolMobile] = useState("");
  const [polBadgeNumber, setPolBadgeNumber] = useState("");
  const [polRegEmployeeId, setPolRegEmployeeId] = useState("");
  const [polRegPassword, setPolRegPassword] = useState("");
  const [polRegConfirmPassword, setPolRegConfirmPassword] = useState("");
  const [polRank, setPolRank] = useState("Inspector");
  const [polRegDepartment, setPolRegDepartment] = useState("Crime Branch & AI Intelligence");

  // OTP Modal State
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPurpose, setOtpPurpose] = useState<"REGISTRATION" | "PASSWORD_RESET">("REGISTRATION");
  const [pendingUserType, setPendingUserType] = useState<"citizen" | "police">("citizen");
  const [debugOtp, setDebugOtp] = useState<string | undefined>(undefined);

  const navigateTo = (step: typeof currentStep) => { setErrorMessage(""); setCurrentStep(step); };

  const handleCitizenLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage(""); setLoading(true);
    try {
      const res = await loginUser({ identifier: citIdentifier || "rahul.k@example.com", password: citPassword || "Citizen@12345", role: "citizen" });
      onLoginSuccess(res.user);
    } catch (err: any) { setErrorMessage(err.message || "Login failed."); }
    finally { setLoading(false); }
  };

  const handleCitizenRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage("");
    if (regPassword !== regConfirmPassword) { setErrorMessage("Passwords do not match."); return; }
    setLoading(true);
    try {
      const otpRes = await sendEmailOtp(regEmail, "REGISTRATION");
      setDebugOtp(otpRes.debug_otp);
      setOtpEmail(regEmail);
      setOtpPurpose("REGISTRATION");
      setPendingUserType("citizen");
      setOtpModalOpen(true);
    } catch (err: any) { setErrorMessage(err.message || "Failed to send OTP to email."); }
    finally { setLoading(false); }
  };

  const handlePoliceRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage("");
    if (polRegPassword !== polRegConfirmPassword) { setErrorMessage("Passwords do not match."); return; }
    setLoading(true);
    try {
      const otpRes = await sendEmailOtp(polEmail, "REGISTRATION");
      setDebugOtp(otpRes.debug_otp);
      setOtpEmail(polEmail);
      setOtpPurpose("REGISTRATION");
      setPendingUserType("police");
      setOtpModalOpen(true);
    } catch (err: any) { setErrorMessage(err.message || "Failed to send OTP to email."); }
    finally { setLoading(false); }
  };

  const handleOtpVerify = async (otpCode: string) => {
    if (otpPurpose === "REGISTRATION") {
      await verifyEmailOtp(otpEmail, otpCode, "REGISTRATION");
      if (pendingUserType === "citizen") {
        const res = await registerUser({
          full_name: regFullName,
          email: regEmail,
          phone: regMobile,
          password: regPassword,
          address: regAddress,
          state: regState,
          city: regCity,
          pin_code: regPinCode,
          citizen_id: regCitizenId,
        });
        setOtpModalOpen(false);
        onLoginSuccess(res.user);
      } else {
        const res = await registerPoliceOfficer({
          full_name: polFullName,
          email: polEmail,
          phone: polMobile,
          employee_id: polRegEmployeeId,
          badge_number: polBadgeNumber,
          password: polRegPassword,
          rank: polRank,
          department: polRegDepartment,
        });
        setOtpModalOpen(false);
        onLoginSuccess(res.user);
      }
    }
  };

  const handleOtpResend = async () => {
    const otpRes = await sendEmailOtp(otpEmail, otpPurpose);
    setDebugOtp(otpRes.debug_otp);
  };

  const handlePoliceLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErrorMessage(""); setLoading(true);
    try {
      const res = await loginUser({ identifier: polEmployeeId || "c.sterling@delhipolice.gov.in", password: polPassword || "Admin@12345", role: "police_admin" });
      onLoginSuccess(res.user);
    } catch (err: any) { setErrorMessage(err.message || "Authentication failed."); }
    finally { setLoading(false); }
  };

  const handleDemoLogin = async (role: UserRole) => {
    setLoading(true); setErrorMessage("");
    try {
      const email = role === "police_admin" ? "c.sterling@delhipolice.gov.in" : "rahul.k@example.com";
      const pass  = role === "police_admin" ? "Admin@12345" : "Citizen@12345";
      const res   = await loginUser({ identifier: email, password: pass, role });
      onLoginSuccess(res.user);
    } catch (err: any) { setErrorMessage("Demo error: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <Shell>
      {/* Portal select */}
      {currentStep === "portal_select" && (
        <PortalSelectPanel
          onCitizen={() => navigateTo("citizen_auth")}
          onPolice={()  => navigateTo("police_auth")}
          onDemo={handleDemoLogin}
          loading={loading}
        />
      )}

      {/* Citizen auth */}
      {currentStep === "citizen_auth" && (
        <div className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(59,130,246,0.15)", backdropFilter: "blur(24px)" }}>
          <div className="p-5 flex items-center justify-between"
            style={{ background: "rgba(37,99,235,0.1)", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(37,99,235,0.2)", border: "1px solid rgba(59,130,246,0.3)" }}>
                <UserIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-black text-white text-sm uppercase tracking-wide">Citizen Portal</p>
                <p className="text-blue-300/60 text-[10px] font-mono">Public Safety & Crime Reporting</p>
              </div>
            </div>
            <button type="button" onClick={() => navigateTo("portal_select")}
              className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 hover:text-blue-300 cursor-pointer px-2 py-1 rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <ArrowLeft className="w-3 h-3" /><span>Back</span>
            </button>
          </div>
          <div className="p-6">
            <ErrorBanner message={errorMessage} />
            <TabBar active={citizenTab}
              onLogin={()    => { setCitizenTab("login");    setErrorMessage(""); }}
              onRegister={() => { setCitizenTab("register"); setErrorMessage(""); }}
              variant="citizen" />
            {citizenTab === "login"
              ? <CitizenLoginForm
                  identifier={citIdentifier}    setIdentifier={setCitIdentifier}
                  password={citPassword}         setPassword={setCitPassword}
                  rememberMe={rememberMe}        setRememberMe={setRememberMe}
                  onSubmit={handleCitizenLogin}  onForgot={() => setShowForgot(true)}
                  onDemo={() => handleDemoLogin("citizen")} loading={loading} />
              : <CitizenRegisterForm
                  fullName={regFullName}           setFullName={setRegFullName}
                  email={regEmail}                 setEmail={setRegEmail}
                  mobile={regMobile}               setMobile={setRegMobile}
                  password={regPassword}           setPassword={setRegPassword}
                  confirmPassword={regConfirmPassword} setConfirmPassword={setRegConfirmPassword}
                  address={regAddress}             setAddress={setRegAddress}
                  state={regState}                 setState={setRegState}
                  city={regCity}                   setCity={setRegCity}
                  pinCode={regPinCode}             setPinCode={setRegPinCode}
                  citizenId={regCitizenId}         setCitizenId={setRegCitizenId}
                  onSubmit={handleCitizenRegister} loading={loading} />}
          </div>
        </div>
      )}

      {/* Police auth */}
      {currentStep === "police_auth" && (
        <div className="w-full max-w-lg rounded-2xl overflow-hidden"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,175,55,0.12)", backdropFilter: "blur(24px)" }}>
          <div className="p-5 flex items-center justify-between"
            style={{ background: "rgba(212,175,55,0.06)", borderBottom: "1px solid rgba(212,175,55,0.1)" }}>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)" }}>
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-black text-amber-300 text-sm uppercase tracking-wide">Police / Admin Portal</p>
                <p className="text-amber-400/40 text-[10px] font-mono">Government Command Gateway</p>
              </div>
            </div>
            <button type="button" onClick={() => navigateTo("portal_select")}
              className="flex items-center space-x-1 text-[11px] font-mono text-slate-400 hover:text-amber-300 cursor-pointer px-2 py-1 rounded-lg"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <ArrowLeft className="w-3 h-3" /><span>Back</span>
            </button>
          </div>
          <div className="p-6">
            <ErrorBanner message={errorMessage} />
            <TabBar active={policeTab}
              onLogin={()    => { setPoliceTab("login");    setErrorMessage(""); }}
              onRegister={() => { setPoliceTab("register"); setErrorMessage(""); }}
              variant="police" />
            {policeTab === "login"
              ? <PoliceLoginForm
                  employeeId={polEmployeeId}     setEmployeeId={setPolEmployeeId}
                  password={polPassword}          setPassword={setPolPassword}
                  department={polDepartment}      setDepartment={setPolDepartment}
                  station={polStation}            setStation={setPolStation}
                  rememberMe={rememberMe}         setRememberMe={setRememberMe}
                  onSubmit={handlePoliceLogin}    onForgot={() => setShowForgot(true)}
                  onDemo={() => handleDemoLogin("police_admin")} loading={loading} />
              : <PoliceRegisterForm
                  fullName={polFullName}         setFullName={setPolFullName}
                  email={polEmail}               setEmail={setPolEmail}
                  mobile={polMobile}             setMobile={setPolMobile}
                  employeeId={polRegEmployeeId}  setEmployeeId={setPolRegEmployeeId}
                  badgeNumber={polBadgeNumber}   setBadgeNumber={setPolBadgeNumber}
                  password={polRegPassword}      setPassword={setPolRegPassword}
                  confirmPassword={polRegConfirmPassword} setConfirmPassword={setPolRegConfirmPassword}
                  rank={polRank}                 setRank={setPolRank}
                  department={polRegDepartment}  setDepartment={setPolRegDepartment}
                  onSubmit={handlePoliceRegister} loading={loading} />}
          </div>
        </div>
      )}

      {/* Forgot modal */}
      {showForgot && <ForgotModal onClose={() => setShowForgot(false)} />}

      {/* OTP Verification Modal */}
      <OtpVerificationModal
        email={otpEmail}
        purpose={otpPurpose}
        isOpen={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        onVerify={handleOtpVerify}
        onResend={handleOtpResend}
        initialDebugOtp={debugOtp}
      />
    </Shell>
  );
};
