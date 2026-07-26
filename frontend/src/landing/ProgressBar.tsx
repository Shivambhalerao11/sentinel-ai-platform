/**
 * ProgressBar – Cinematic loading progress indicator
 * Thin gold line at the bottom + phase label
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LandingPhase } from "./useCinematicSequence";

interface Props {
  progress: number;
  phase: LandingPhase;
  onSkip: () => void;
}

const PHASE_LABELS: Record<LandingPhase, string> = {
  idle:               "INITIALIZING SECURE GATEWAY...",
  particle_birth:     "ESTABLISHING ENCRYPTED CHANNEL...",
  gov_reveal:         "GOVERNMENT OF INDIA — NATIONAL INTELLIGENCE AUTHORITY",
  ministry_reveal:    "MINISTRY OF HOME AFFAIRS — SECURE COMMAND NETWORK",
  emblem_assembly:    "LOADING NATIONAL EMBLEM...",
  flag_sweep:         "AUTHENTICATING GOVERNMENT PORTAL...",
  india_map:          "LOADING NATIONAL INTELLIGENCE GRID...",
  network_lines:      "CONNECTING TO COMMAND NETWORK...",
  ai_scan:            "AI THREAT ASSESSMENT ENGINE ONLINE...",
  title_reveal:       "SENTINEL PLATFORM READY...",
  portal_transition:  "LAUNCHING SECURE PORTAL...",
  complete:           "ACCESS GRANTED",
};

const ProgressBar: React.FC<Props> = memo(({ progress, phase, onSkip }) => (
  <AnimatePresence>
    {phase !== "complete" && (
      <motion.div
        className="fixed bottom-0 inset-x-0 z-50 pb-6 px-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Phase label + skip */}
          <div className="flex items-center justify-between">
            <motion.p
              key={phase}
              className="text-[10px] font-mono tracking-[0.3em] uppercase"
              style={{ color: "rgba(212,175,55,0.7)" }}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {PHASE_LABELS[phase]}
            </motion.p>
            <button
              onClick={onSkip}
              className="text-[10px] font-mono tracking-widest uppercase transition-colors cursor-pointer"
              style={{ color: "rgba(148,163,184,0.5)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(212,175,55,0.8)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(148,163,184,0.5)")}
            >
              SKIP →
            </button>
          </div>

          {/* Progress track */}
          <div
            className="relative h-px w-full rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                background: "linear-gradient(90deg, #8B6914 0%, #D4AF37 50%, #F5E27A 100%)",
                boxShadow: "0 0 8px 1px rgba(212,175,55,0.5)",
              }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "linear" }}
            />
            {/* Shimmer */}
            <motion.div
              className="absolute inset-y-0 w-16 rounded-full"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
              }}
              animate={{ left: ["-10%", "110%"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Percentage */}
          <div className="flex justify-end">
            <span
              className="font-mono text-[9px] tabular-nums"
              style={{ color: "rgba(212,175,55,0.4)" }}
            >
              {Math.round(progress).toString().padStart(3, "0")}%
            </span>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
));

ProgressBar.displayName = "ProgressBar";
export default ProgressBar;
