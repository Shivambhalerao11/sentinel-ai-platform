/**
 * PortalSelector – The premium glassmorphism portal selection screen.
 * Replaces the old AuthScreen portal_select step.
 * Fades in after the cinematic sequence completes.
 */
import React, { useState, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, User, ArrowRight, Lock, CheckCircle, Radio, Sparkles, Sun, Moon } from "lucide-react";
import type { UserRole } from "../types";
import { useTheme } from "../context/ThemeContext";

const ThemeToggleButton: React.FC = () => {
  const { themeMode, toggleTheme } = useTheme();
  const isDark = themeMode === "dark";

  return (
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
  );
};

interface Props {
  visible: boolean;
  onSelectCitizen: () => void;
  onSelectPolice: () => void;
  onDemoLogin: (role: UserRole) => void;
  loading: boolean;
}

// ─── Magnetic button hook ─────────────────────────────────────────────────────
function useMagneticEffect(strength = 0.3) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * strength;
      const dy = (e.clientY - cy) * strength;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    [strength]
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (el) el.style.transform = "translate(0,0)";
  }, []);

  return { ref, handleMove, handleLeave };
}

// ─── Portal card ──────────────────────────────────────────────────────────────
interface CardProps {
  variant: "citizen" | "police";
  onClick: () => void;
  index: number;
}

const PortalCard: React.FC<CardProps> = ({ variant, onClick, index }) => {
  const isCitizen = variant === "citizen";
  const { ref, handleMove, handleLeave } = useMagneticEffect(0.08);
  const [hovered, setHovered] = useState(false);
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";

  const features = isCitizen
    ? ["Instant e-FIR Filing", "GPS Emergency SOS", "Real-time Case Tracking", "AI Legal Assistant"]
    : ["Command & Dispatch", "AI Crime Triage", "GIS Tactical Map", "Predictive Analytics"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.35 + index * 0.15,
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative"
    >
      <div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={() => { handleLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
        onClick={onClick}
        className="cursor-pointer group relative rounded-2xl overflow-hidden"
        style={{
          transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease, border-color 0.3s ease",
          background: isDark
            ? (isCitizen
                ? "linear-gradient(135deg, rgba(15,35,75,0.95) 0%, rgba(8,20,50,0.98) 100%)"
                : "linear-gradient(135deg, rgba(8,15,35,0.98) 0%, rgba(15,30,60,0.95) 100%)")
            : "#FFFFFF",
          border: isDark
            ? (isCitizen
                ? "1px solid rgba(59,130,246,0.2)"
                : "1px solid rgba(212,175,55,0.2)")
            : (isCitizen
                ? "1px solid rgba(37,99,235,0.25)"
                : "1px solid rgba(212,175,55,0.35)"),
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: hovered
            ? (isDark
                ? (isCitizen
                    ? "0 30px 80px rgba(37,99,235,0.2), 0 0 0 1px rgba(59,130,246,0.3), inset 0 1px 0 rgba(255,255,255,0.05)"
                    : "0 30px 80px rgba(212,175,55,0.15), 0 0 0 1px rgba(212,175,55,0.3), inset 0 1px 0 rgba(255,255,255,0.05)")
                : (isCitizen
                    ? "0 20px 50px rgba(37,99,235,0.15), 0 0 0 1px rgba(37,99,235,0.4)"
                    : "0 20px 50px rgba(212,175,55,0.2), 0 0 0 1px rgba(212,175,55,0.4)"))
            : (isDark
                ? "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)"
                : "0 10px 30px rgba(15,23,42,0.08)"),
        }}
      >
        {/* Hover glow overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{
            background: isCitizen
              ? "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.08) 0%, transparent 70%)"
              : "radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 70%)",
          }}
        />

        {/* Top accent line */}
        <motion.div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background: isCitizen
              ? "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)"
              : "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)",
          }}
          animate={{ opacity: hovered ? 1 : 0.3 }}
          transition={{ duration: 0.3 }}
        />

        <div className="p-8">
          {/* Restricted badge — police only */}
          {!isCitizen && (
            <motion.div
              className="inline-flex items-center space-x-1.5 mb-5 px-3 py-1 rounded-full"
              style={{
                background: isDark ? "rgba(212,175,55,0.08)" : "rgba(212,175,55,0.12)",
                border: isDark ? "1px solid rgba(212,175,55,0.2)" : "1px solid rgba(212,175,55,0.35)",
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Lock className={`w-3 h-3 ${isDark ? "text-amber-400" : "text-amber-700"}`} />
              <span className={`${isDark ? "text-amber-400" : "text-amber-800"} font-mono text-[9px] tracking-[0.25em] uppercase font-bold`}>
                Government Authorized Only
              </span>
            </motion.div>
          )}

          {/* Icon */}
          <motion.div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
            style={{
              background: isCitizen
                ? (isDark ? "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(29,78,216,0.1))" : "rgba(37,99,235,0.08)")
                : (isDark ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(161,119,0,0.1))" : "rgba(212,175,55,0.12)"),
              border: isCitizen
                ? "1px solid rgba(59,130,246,0.3)"
                : "1px solid rgba(212,175,55,0.3)",
              boxShadow: hovered
                ? isCitizen
                  ? "0 0 30px rgba(37,99,235,0.3)"
                  : "0 0 30px rgba(212,175,55,0.3)"
                : "none",
            }}
            animate={{ scale: hovered ? 1.05 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {isCitizen
              ? <User className={`w-8 h-8 ${isDark ? "text-blue-400" : "text-[#163A70]"}`} />
              : <Shield className={`w-8 h-8 ${isDark ? "text-amber-400" : "text-[#8B6914]"}`} />
            }
          </motion.div>

          {/* Title */}
          <h2
            className="text-2xl font-black mb-2 tracking-tight"
            style={{
              color: isDark
                ? (isCitizen ? "rgba(226,232,240,1)" : "rgba(251,191,36,1)")
                : (isCitizen ? "#0F172A" : "#8B6914"),
            }}
          >
            {isCitizen ? "Citizen Portal" : "Police / Admin Portal"}
          </h2>

          <p className={`${isDark ? "text-slate-400 font-light" : "text-[#475569] font-normal"} text-sm leading-relaxed mb-6`}>
            {isCitizen
              ? "File complaints, track cases, request emergency dispatch, and access AI-powered legal guidance."
              : "Restricted command access for authorized law enforcement and administrative personnel."}
          </p>

          {/* Feature list */}
          <ul className="space-y-2.5 mb-8">
            {features.map((feat, i) => (
              <motion.li
                key={feat}
                className="flex items-center space-x-2.5 text-xs font-semibold"
                style={{ color: isDark ? "rgba(148,163,184,0.9)" : "#334155" }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
              >
                <CheckCircle
                  className="w-4 h-4 shrink-0"
                  style={{ color: isCitizen ? (isDark ? "rgba(52,211,153,0.9)" : "#059669") : (isDark ? "rgba(212,175,55,0.9)" : "#D4AF37") }}
                />
                <span>{feat}</span>
              </motion.li>
            ))}
          </ul>

          {/* CTA button */}
          <motion.button
            className="w-full py-4 px-6 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center space-x-2.5 relative overflow-hidden cursor-pointer"
            style={{
              background: isCitizen
                ? "linear-gradient(135deg, #1d4ed8, #2563eb)"
                : "linear-gradient(135deg, #92400e, #d97706, #D4AF37)",
              color: isCitizen ? "white" : "rgba(7,6,0,1)",
              boxShadow: isCitizen
                ? "0 4px 24px rgba(37,99,235,0.3)"
                : "0 4px 24px rgba(212,175,55,0.35)",
            }}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {/* Button shimmer */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              }}
              animate={{ x: hovered ? ["−100%", "200%"] : "-100%" }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
            />
            <span>{isCitizen ? "Enter Citizen Portal" : "Enter Command Center"}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main PortalSelector ──────────────────────────────────────────────────────
const PortalSelector: React.FC<Props> = memo(({
  visible, onSelectCitizen, onSelectPolice, onDemoLogin, loading,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto"
          style={{
            background: isDark
              ? "linear-gradient(180deg, #000810 0%, #020d1f 50%, #000810 100%)"
              : "radial-gradient(ellipse 80% 50% at 50% 0%, #EEF3FF 0%, #F8FAFC 60%, #F1F5F9 100%)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Subtle background grid */}
          <div
            className="absolute inset-0 pointer-events-none opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(20,184,166,0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(20,184,166,0.4) 1px, transparent 1px)
              `,
              backgroundSize: "60px 60px",
            }}
          />

          {/* Top government bar */}
          <motion.div
            className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-3 border-b"
            style={{
              borderColor: isDark ? "rgba(212,175,55,0.08)" : "rgba(22,58,112,0.12)",
              background: isDark ? "rgba(0,0,0,0.75)" : "rgba(255,255,255,0.85)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
            }}
            initial={{ y: -48, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center space-x-3">
              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="metallic-text font-mono text-[10px] tracking-[0.38em] uppercase font-black">
                Government of India
              </span>
              <span className="text-white/10 hidden sm:inline select-none">|</span>
              <span
                className="font-mono text-[10px] tracking-wider hidden sm:inline"
                style={{ color: isDark ? "rgba(148,163,184,0.45)" : "#475569" }}
              >
                Ministry of Home Affairs
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span className="font-mono text-[10px] text-emerald-400 tracking-widest uppercase">
                  Secure TLS 1.3
                </span>
              </div>

              {/* Theme Toggle Button */}
              <ThemeToggleButton />
            </div>
          </motion.div>

          <div className="w-full max-w-5xl mx-auto px-4 py-20">
            {/* Header */}
            <motion.div
              className="text-center mb-14"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Wordmark */}
              <div className="flex items-center justify-center space-x-3 mb-4">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-400/30" />
                <span className="metallic-text font-black tracking-[0.4em] uppercase text-xl">
                  SENTINEL
                </span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-400/30" />
              </div>

              <h1 className={`text-4xl sm:text-5xl font-black tracking-tight mb-3 ${isDark ? "text-white" : "text-[#0F172A]"}`}>
                Choose Your Portal
              </h1>
              <p className={`text-sm font-light max-w-md mx-auto leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                Select your access tier to enter the National AI Crime Intelligence Network.
              </p>
            </motion.div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <PortalCard variant="citizen" onClick={onSelectCitizen} index={0} />
            <PortalCard variant="police" onClick={onSelectPolice} index={1} />
          </div>

          {/* Demo bar */}
          <motion.div
            className="mt-10 flex flex-col sm:flex-row items-center justify-center space-y-3 sm:space-y-0 sm:space-x-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <span
              className="flex items-center space-x-1.5 text-xs font-mono"
              style={{ color: "rgba(148,163,184,0.5)" }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500/60" />
              <span>Instant demo access:</span>
            </span>
            <div className="flex items-center space-x-3">
              <motion.button
                onClick={() => !loading && onDemoLogin("citizen")}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase border cursor-pointer disabled:opacity-40 transition-all"
                style={{
                  background: "rgba(37,99,235,0.08)",
                  borderColor: "rgba(59,130,246,0.2)",
                  color: "rgba(147,197,253,0.8)",
                }}
                whileHover={{ scale: 1.04, borderColor: "rgba(59,130,246,0.5)" }}
                whileTap={{ scale: 0.96 }}
              >
                {loading ? "Loading..." : "Citizen Demo"}
              </motion.button>
              <motion.button
                onClick={() => !loading && onDemoLogin("police_admin")}
                disabled={loading}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold tracking-wider uppercase border cursor-pointer disabled:opacity-40 transition-all"
                style={{
                  background: "rgba(212,175,55,0.06)",
                  borderColor: "rgba(212,175,55,0.2)",
                  color: "rgba(212,175,55,0.8)",
                }}
                whileHover={{ scale: 1.04, borderColor: "rgba(212,175,55,0.5)" }}
                whileTap={{ scale: 0.96 }}
              >
                {loading ? "Loading..." : "Police Demo"}
              </motion.button>
            </div>
          </motion.div>

          {/* Security footnote */}
          <motion.p
            className="text-center font-mono text-[10px] tracking-widest mt-10 uppercase"
            style={{ color: "rgba(71,85,105,0.7)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            BNS 2023 Compliant · End-to-End Encrypted · ISO 27001 Certified Infrastructure
          </motion.p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
  );
});

PortalSelector.displayName = "PortalSelector";
export default PortalSelector;
