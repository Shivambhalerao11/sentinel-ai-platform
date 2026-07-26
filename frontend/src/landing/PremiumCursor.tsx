/**
 * PremiumCursor – Ashoka-Stambh-inspired gold cursor.
 * Uses two interpolated layers:
 *   1. Small gold dot  — follows cursor at 1:1 speed
 *   2. Outer ring      — follows with spring lag (magnetic feel)
 *
 * No external deps beyond motion/react (already installed).
 * GPU-composited via transform: translate() only.
 * Hides the default OS cursor on the landing page.
 */
import React, { useEffect, useRef, memo } from "react";

interface CursorPos { x: number; y: number; }

const LERP = 0.14; // outer ring follow speed (0=instant, lower=more lag)

const PremiumCursor: React.FC = memo(() => {
  const dotRef   = useRef<HTMLDivElement>(null);
  const ringRef  = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement[]>([]);

  const mouse   = useRef<CursorPos>({ x: -200, y: -200 });
  const ring    = useRef<CursorPos>({ x: -200, y: -200 });
  const rafId   = useRef<number>(0);
  const hovered = useRef(false);

  useEffect(() => {
    const dots = trailRef.current;
    const trailPositions: CursorPos[] = Array.from({ length: 4 }, () => ({ x: -200, y: -200 }));

    // ── Mouse move ────────────────────────────────────────────────────────
    const onMove = (e: MouseEvent) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    // ── Hover detection on interactive elements ───────────────────────────
    const onEnter = () => { hovered.current = true; };
    const onLeave = () => { hovered.current = false; };
    document.querySelectorAll("button,a,[data-cursor],[role=button]").forEach(el => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    // ── RAF animation loop ────────────────────────────────────────────────
    const tick = () => {
      // Interpolate outer ring toward mouse
      ring.current.x += (mouse.current.x - ring.current.x) * LERP;
      ring.current.y += (mouse.current.y - ring.current.y) * LERP;

      // Position main dot exactly on cursor
      if (dotRef.current) {
        dotRef.current.style.transform =
          `translate(${mouse.current.x - 4}px, ${mouse.current.y - 4}px)`;
      }

      // Position outer ring with lag
      if (ringRef.current) {
        const scale = hovered.current ? 1.6 : 1;
        ringRef.current.style.transform =
          `translate(${ring.current.x - 18}px, ${ring.current.y - 18}px) scale(${scale})`;
      }

      // Trail dots — cascade behind ring
      trailPositions[0] = { ...ring.current };
      for (let i = 1; i < trailPositions.length; i++) {
        trailPositions[i].x += (trailPositions[i - 1].x - trailPositions[i].x) * 0.5;
        trailPositions[i].y += (trailPositions[i - 1].y - trailPositions[i].y) * 0.5;
        if (dots[i]) {
          const opacity = 0.35 - i * 0.08;
          const size = 3 - i * 0.5;
          dots[i].style.transform =
            `translate(${trailPositions[i].x - size / 2}px, ${trailPositions[i].y - size / 2}px)`;
          dots[i].style.opacity = String(Math.max(0, opacity));
        }
      }

      rafId.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      {/* Outer ring — Ashoka spoke pattern */}
      <div
        ref={ringRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999]"
        style={{
          width: 36,
          height: 36,
          willChange: "transform",
          transition: "transform 0.04s linear",
        }}
      >
        <svg viewBox="0 0 36 36" width="36" height="36">
          {/* 12 spokes — minimal Ashoka-inspired */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const inner = 11, outer = 16;
            return (
              <line
                key={i}
                x1={18 + Math.cos(a) * inner}
                y1={18 + Math.sin(a) * inner}
                x2={18 + Math.cos(a) * outer}
                y2={18 + Math.sin(a) * outer}
                stroke="rgba(212,175,55,0.7)"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            );
          })}
          {/* Outer circle */}
          <circle cx="18" cy="18" r="16" fill="none"
            stroke="rgba(212,175,55,0.35)" strokeWidth="0.7" />
          {/* Inner ring */}
          <circle cx="18" cy="18" r="10" fill="none"
            stroke="rgba(212,175,55,0.2)" strokeWidth="0.5" />
        </svg>
        {/* Glow behind ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: "0 0 10px 2px rgba(212,175,55,0.18)" }}
        />
      </div>

      {/* Center gold dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full"
        style={{
          width: 8, height: 8,
          background: "radial-gradient(circle, #F5E27A 0%, #D4AF37 60%, #8B6914 100%)",
          boxShadow: "0 0 8px 2px rgba(212,175,55,0.6)",
          willChange: "transform",
        }}
      />

      {/* Trail particles */}
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          ref={el => { if (el) trailRef.current[i] = el; }}
          className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full"
          style={{
            width: 3 - i * 0.4,
            height: 3 - i * 0.4,
            background: `rgba(212,175,55,${0.5 - i * 0.1})`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </>
  );
});

PremiumCursor.displayName = "PremiumCursor";
export default PremiumCursor;
