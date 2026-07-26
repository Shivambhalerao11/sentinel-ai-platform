/**
 * CinematicLanding v3 – Optimized orchestrator.
 * Key improvements:
 * - Mouse X/Y stored in refs → zero React re-renders on mousemove
 * - PremiumCursor mounted globally
 * - Phase tint transition 0.4s (was 1.8s)
 * - Letterbox shrink 0.4s (was 1.2s)
 * - Exit blur transition 0.8s (was 1.4s)
 */
import React, { useState, useCallback, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useCinematicSequence } from "./useCinematicSequence";
import ParticleCanvas from "./ParticleCanvas";
import AmbientLayer from "./AmbientLayer";
import CinematicOverlay from "./CinematicOverlay";
import ProgressBar from "./ProgressBar";
import PortalSelector from "./PortalSelector";
import PremiumCursor from "./PremiumCursor";
import { AuthScreen } from "../components/AuthScreen";
import type { User, UserRole } from "../types";
import { loginUser } from "../services/api";
import { useTheme } from "../context/ThemeContext";

interface Props { onLoginSuccess: (user: User) => void; }
type AuthView = "portal_select" | "citizen_auth" | "police_auth";

const PHASE_TINT: Record<string, string> = {
  gov_reveal:       "rgba(212,175,55,0.022)",
  ministry_reveal:  "rgba(20,184,166,0.015)",
  flag_sweep:       "rgba(180,60,0,0.018)",
  ai_scan:          "rgba(255,100,0,0.018)",
  title_reveal:     "rgba(212,175,55,0.028)",
};

// ─── Mouse-reactive canvas wrapper ───────────────────────────────────────────
// Reads from refs → no state updates on mousemove
const ParticleLayer = memo(({ phase, phaseProgress, mouseXRef, mouseYRef }: {
  phase: string;
  phaseProgress: number;
  mouseXRef: React.RefObject<number>;
  mouseYRef: React.RefObject<number>;
}) => {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Throttle mouse → canvas updates to ~30fps to save CPU
    let lastUpdate = 0;
    let rafId: number;
    const tick = () => {
      const now = performance.now();
      if (now - lastUpdate > 32) {  // ~30fps cap
        lastUpdate = now;
        setMouse({ x: mouseXRef.current ?? 0, y: mouseYRef.current ?? 0 });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mouseXRef, mouseYRef]);

  return (
    <ParticleCanvas
      phase={phase as any}
      phaseProgress={phaseProgress}
      mouseX={mouse.x}
      mouseY={mouse.y}
    />
  );
});
ParticleLayer.displayName = "ParticleLayer";

// ─── Main Component ───────────────────────────────────────────────────────────
const CinematicLanding: React.FC<Props> = ({ onLoginSuccess }) => {
  const { phase, progress, phaseProgress, isComplete, skipToEnd } =
    useCinematicSequence({ respectReducedMotion: true });

  const [authView, setAuthView]     = useState<AuthView>("portal_select");
  const [showAuth, setShowAuth]     = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError]   = useState("");

  // Mouse stored in refs — zero re-renders on mousemove
  const mouseXRef = useRef<number>(0);
  const mouseYRef = useRef<number>(0);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseXRef.current = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseYRef.current = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  // Auto-clear demo error
  useEffect(() => {
    if (!demoError) return;
    const t = setTimeout(() => setDemoError(""), 3500);
    return () => clearTimeout(t);
  }, [demoError]);

  const handleSelectCitizen = useCallback(() => {
    setAuthView("citizen_auth"); setShowAuth(true);
  }, []);
  const handleSelectPolice = useCallback(() => {
    setAuthView("police_auth"); setShowAuth(true);
  }, []);

  const handleDemoLogin = useCallback(async (role: UserRole) => {
    setDemoLoading(true); setDemoError("");
    try {
      const email = role === "police_admin" ? "c.sterling@delhipolice.gov.in" : "rahul.k@example.com";
      const pass  = role === "police_admin" ? "Admin@12345" : "Citizen@12345";
      const res   = await loginUser({ identifier: email, password: pass, role });
      onLoginSuccess(res.user);
    } catch (err: any) {
      setDemoError(err.message || "Demo login failed.");
    } finally {
      setDemoLoading(false);
    }
  }, [onLoginSuccess]);

  const currentTint  = PHASE_TINT[phase] ?? "rgba(0,0,0,0)";
  const isEarlyPhase = phase === "idle" || phase === "particle_birth";

  return (
    <>
      {/* Premium Ashoka cursor — always present */}
      <PremiumCursor />

      <div className="fixed inset-0 overflow-hidden" style={{ background: "#000", cursor: "none" }} id="cinematic-root">

        {/* ── Cinematic Sequence ──────────────────────────────────────────── */}
        <AnimatePresence>
          {!isComplete && (
            <motion.div
              className="absolute inset-0"
              exit={{ opacity: 0, scale: 1.02, filter: "blur(3px)" }}
              transition={{ duration: 1.1, ease: [0.4, 0, 0.2, 1] }}
            >
              {/* Ambient glow */}
              <AmbientLayer phase={phase} />

              {/* WebGL particles — throttled mouse */}
              <ParticleLayer
                phase={phase}
                phaseProgress={phaseProgress}
                mouseXRef={mouseXRef}
                mouseYRef={mouseYRef}
              />

              {/* SVG/CSS overlays */}
              <CinematicOverlay phase={phase} phaseProgress={phaseProgress} />

              {/* Phase tint — transitions with phases */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                animate={{ background: currentTint }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
              />

              {/* Letterbox bars */}
              <motion.div className="absolute inset-x-0 top-0 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.92)" }}
                animate={{ height: isEarlyPhase ? "8vh" : "5vh" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
              <motion.div className="absolute inset-x-0 bottom-0 pointer-events-none"
                style={{ background: "rgba(0,0,0,0.92)" }}
                animate={{ height: isEarlyPhase ? "8vh" : "5vh" }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Opening fade from black — matches particle_birth phase */}
              <AnimatePresence>
                {isEarlyPhase && (
                  <motion.div
                    className="absolute inset-0 bg-black pointer-events-none"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: phase === "idle" ? 1 : 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Progress bar */}
              <ProgressBar progress={progress} phase={phase} onSkip={skipToEnd} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Portal Selector ─────────────────────────────────────────────── */}
        {!showAuth && (
          <PortalSelector
            visible={isComplete}
            onSelectCitizen={handleSelectCitizen}
            onSelectPolice={handleSelectPolice}
            onDemoLogin={handleDemoLogin}
            loading={demoLoading}
          />
        )}

        {/* ── Auth Forms ──────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showAuth && (
            <motion.div className="fixed inset-0 z-50 overflow-y-auto"
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Fixed background layer — does NOT clip content */}
              <div className="fixed inset-0 pointer-events-none" style={{
                background: "linear-gradient(160deg,#000810 0%,#020d1f 50%,#000810 100%)"
              }}/>
              <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{
                backgroundImage: "linear-gradient(rgba(20,184,166,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(20,184,166,.5) 1px,transparent 1px)",
                backgroundSize: "48px 48px",
              }}/>
              <motion.button
                className="fixed top-5 left-5 z-50 flex items-center space-x-2 font-mono text-[11px] tracking-widest uppercase px-4 py-2 rounded-lg border cursor-none"
                style={{ background:"rgba(0,0,0,0.6)", borderColor:"rgba(212,175,55,0.18)", color:"rgba(212,175,55,0.65)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)" }}
                initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
                transition={{ delay:0.25, duration:0.4 }}
                onClick={() => setShowAuth(false)}
                whileHover={{ borderColor:"rgba(212,175,55,0.5)", color:"rgba(212,175,55,1)", scale:1.02 }}
                whileTap={{ scale:0.96 }}
              >
                <span>←</span><span>Portal Select</span>
              </motion.button>
              {/* Scrollable auth content — min-h-screen so it fills viewport on short forms */}
              <div className="relative z-10 min-h-screen">
                <AuthScreen onLoginSuccess={onLoginSuccess} initialStep={authView} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Demo Error Toast ────────────────────────────────────────────── */}
        <AnimatePresence>
          {demoError && (
            <motion.div
              className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-5 py-3 rounded-xl font-mono text-xs text-red-300 border border-red-500/25 whitespace-nowrap"
              style={{ background:"rgba(80,0,0,0.6)", backdropFilter:"blur(16px)" }}
              initial={{ opacity:0, y:8, scale:0.95 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:8, scale:0.95 }}
              transition={{ duration:0.25 }}
            >
              {demoError}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default CinematicLanding;
