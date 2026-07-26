/**
 * AmbientLayer v2 – Phase-aware volumetric background.
 * Improved: golden rim lighting, stronger orbitals, phase-reactive glow.
 */
import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { LandingPhase } from "./useCinematicSequence";

interface Props { phase: LandingPhase; }

// Color config per phase
const PHASE_GLOW: Record<string, string> = {
  gov_reveal:       "radial-gradient(ellipse 55% 40% at 50% 50%, rgba(212,175,55,0.09) 0%, transparent 70%)",
  ministry_reveal:  "radial-gradient(ellipse 55% 40% at 50% 50%, rgba(212,175,55,0.07) 0%, rgba(20,184,166,0.03) 60%, transparent 80%)",
  emblem_assembly:  "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(212,175,55,0.08) 0%, transparent 70%)",
  flag_sweep:       "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(200,80,0,0.07) 0%, rgba(255,252,240,0.03) 40%, rgba(10,110,30,0.06) 80%, transparent 100%)",
  india_map:        "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(20,184,166,0.06) 0%, transparent 70%)",
  network_lines:    "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(20,184,166,0.07) 0%, transparent 70%)",
  ai_scan:          "radial-gradient(ellipse 55% 55% at 50% 50%, rgba(255,120,0,0.07) 0%, transparent 70%)",
  title_reveal:     "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(212,175,55,0.1) 0%, transparent 65%)",
  portal_transition:"radial-gradient(ellipse 40% 40% at 50% 50%, rgba(212,175,55,0.12) 0%, transparent 60%)",
};

const AmbientLayer: React.FC<Props> = memo(({ phase }) => {
  const showOrbitals = ["emblem_assembly","flag_sweep","title_reveal","portal_transition","gov_reveal","ministry_reveal"].includes(phase);
  const showSatellite = ["india_map","network_lines","ai_scan"].includes(phase);
  const glow = PHASE_GLOW[phase] || "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(212,175,55,0.05) 0%, transparent 70%)";

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* Base background — deep navy */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 90% 70% at 50% 35%, #08152e 0%, #040a16 55%, #000000 100%)",
        }}
      />

      {/* Phase-reactive central volumetric glow */}
      <motion.div
        className="absolute inset-0"
        animate={{ background: glow }}
        transition={{ duration: 1.0, ease: "easeInOut" }}
      />

      {/* Golden rim light — upper-left source, always present */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "-20%",
          left: "-10%",
          width: "60vw",
          height: "60vh",
          background: "radial-gradient(ellipse, rgba(212,175,55,0.04) 0%, transparent 70%)",
        }}
      />

      {/* Vignette — deeper than before */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.92) 100%)",
        }}
      />

      {/* ── Orbital rings ── */}
      <AnimatePresence>
        {showOrbitals && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            {[160, 240, 330, 440].map((size, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: size,
                  height: size,
                  border: `1px solid rgba(212,175,55,${Math.max(0.02, 0.08 - i * 0.018)})`,
                  boxShadow: `0 0 ${12 + i * 8}px ${1 + i}px rgba(212,175,55,${Math.max(0.01, 0.035 - i * 0.007)})`,
                }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{ duration: 25 + i * 18, repeat: Infinity, ease: "linear" }}
              />
            ))}

            {/* Breathing inner glow */}
            <motion.div
              className="absolute rounded-full"
              animate={{
                width: [90, 130, 90],
                height: [90, 130, 90],
                opacity: [0.25, 0.08, 0.25],
              }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ border: "1px solid rgba(212,175,55,0.12)" }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Satellite orbit ── */}
      <AnimatePresence>
        {showSatellite && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <svg className="absolute inset-0 w-full h-full opacity-25" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
              <ellipse cx="50" cy="50" rx="44" ry="14" fill="none"
                stroke="rgba(20,184,166,0.5)" strokeWidth="0.12" strokeDasharray="0.8 2" />
              <circle r="0.9" fill="rgba(20,184,166,1)">
                <animateMotion dur="7s" repeatCount="indefinite" path="M 94 50 A 44 14 0 1 1 93.9 50" />
              </circle>
              {/* Satellite trail */}
              <circle r="0.5" fill="rgba(20,184,166,0.4)">
                <animateMotion dur="7s" repeatCount="indefinite" begin="-0.3s" path="M 94 50 A 44 14 0 1 1 93.9 50" />
              </circle>
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating gold dust ── */}
      <div className="absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 1.5 + (i % 3) * 0.8,
              height: 1.5 + (i % 3) * 0.8,
              left: `${5 + i * 5.2}%`,
              top: `${8 + ((i * 41) % 84)}%`,
              background: `rgba(212,175,55,${0.15 + (i % 4) * 0.07})`,
              boxShadow: `0 0 ${2 + i % 4}px rgba(212,175,55,0.2)`,
              animation: `floatDot ${3.5 + (i % 5)}s ease-in-out ${i * 0.35}s infinite alternate`,
            }}
          />
        ))}
      </div>
    </div>
  );
});

AmbientLayer.displayName = "AmbientLayer";
export default AmbientLayer;
