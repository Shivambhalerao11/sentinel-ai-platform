/**
 * Cinematic Sequence State Machine – v4
 * Target: 7–8 seconds. Cinematic pacing. No rushed feel.
 *
 * Design principle:
 *   – GOI reveal: slow & engraved (2.2s)
 *   – Ministry: flows immediately, holographic (1.4s)
 *   – Emblem assembly: medium (1.0s)
 *   – Flag: cloth needs to wave (1.2s)
 *   – Data phases: snappier (0.7s each)
 *   – SENTINEL: dramatic hero moment (2.0s)
 *   – Transition: quick exit (0.6s)
 *   Total phases: ~11.1s
 *   Perceived (due to overlap): ~7.8s
 */
import { useState, useEffect, useCallback } from "react";

export type LandingPhase =
  | "idle"
  | "particle_birth"
  | "gov_reveal"
  | "ministry_reveal"
  | "emblem_assembly"
  | "flag_sweep"
  | "india_map"
  | "network_lines"
  | "ai_scan"
  | "title_reveal"
  | "portal_transition"
  | "complete";

export interface SequenceConfig {
  skipOnClick: boolean;
  respectReducedMotion: boolean;
  phaseDurations: Record<LandingPhase, number>;
}

const DEFAULT_DURATIONS: Record<LandingPhase, number> = {
  idle:                0,
  particle_birth:      700,   // Particles materialize — gentle fade
  gov_reveal:          2200,  // GOVERNMENT OF INDIA — slow engraving, premium
  ministry_reveal:     1400,  // Ministry sweep — flows from GOI
  emblem_assembly:     1000,  // Emblem forms from particles
  flag_sweep:          1200,  // Cloth wave needs time to feel real
  india_map:           700,   // Data phase — snappier
  network_lines:       700,   // Intelligence grid
  ai_scan:             700,   // AI tactical scan
  title_reveal:        2000,  // SENTINEL — dramatic, cinematic hero moment
  portal_transition:   600,   // Quick graceful exit
  complete:            0,
};

export const PHASE_ORDER: LandingPhase[] = [
  "idle",
  "particle_birth",
  "gov_reveal",
  "ministry_reveal",
  "emblem_assembly",
  "flag_sweep",
  "india_map",
  "network_lines",
  "ai_scan",
  "title_reveal",
  "portal_transition",
  "complete",
];

export function useCinematicSequence(config?: Partial<SequenceConfig>) {
  const durations = { ...DEFAULT_DURATIONS, ...config?.phaseDurations };
  const prefersReduced =
    config?.respectReducedMotion !== false &&
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [phase, setPhase]               = useState<LandingPhase>(prefersReduced ? "complete" : "idle");
  const [progress, setProgress]         = useState(0);
  const [phaseProgress, setPhaseProgress] = useState(0);

  const skipToEnd = useCallback(() => {
    setPhase("complete");
    setProgress(100);
    setPhaseProgress(1);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;

    let phaseIndex = 0;
    let phaseTimer: ReturnType<typeof setTimeout>;
    let rafId: number;
    let startTime = Date.now();
    let cancelled = false;

    const totalDuration = PHASE_ORDER.slice(0, -1).reduce(
      (sum, p) => sum + durations[p], 0
    );

    const advancePhase = () => {
      if (cancelled) return;
      phaseIndex++;
      if (phaseIndex >= PHASE_ORDER.length) return;
      const cur = PHASE_ORDER[phaseIndex];
      setPhase(cur);
      startTime = Date.now();
      if (cur === "complete") {
        setProgress(100);
        return;
      }
      phaseTimer = setTimeout(advancePhase, durations[cur]);
    };

    setPhase("idle");
    // Kick off immediately — no initial pause
    phaseTimer = setTimeout(advancePhase, 0);

    // Use rAF for progress — smoother than setInterval
    const tick = () => {
      if (cancelled) return;
      const elapsed = PHASE_ORDER.slice(0, phaseIndex).reduce(
        (sum, p) => sum + durations[p], 0
      );
      const curPhase = PHASE_ORDER[phaseIndex] ?? "idle";
      const phaseDur = durations[curPhase] || 1;
      const phaseElapsed = Date.now() - startTime;
      const pp = Math.min(phaseElapsed / phaseDur, 1);
      setPhaseProgress(pp);
      const overall = Math.min(((elapsed + phaseElapsed) / totalDuration) * 100, 99);
      setProgress(overall);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      clearTimeout(phaseTimer);
      cancelAnimationFrame(rafId);
    };
  }, [prefersReduced]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    phase,
    phaseIndex: PHASE_ORDER.indexOf(phase),
    progress,
    phaseProgress,
    isComplete: phase === "complete",
    skipToEnd,
  };
}
