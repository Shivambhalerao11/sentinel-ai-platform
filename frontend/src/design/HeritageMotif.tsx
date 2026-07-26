/**
 * HeritageMotif – Original decorative element inspired by Indian heritage.
 * Geometric chakra-pillar fusion. NOT the official State Emblem.
 * Placed as a subtle, premium corner accent on every page.
 */
import React, { memo } from "react";

interface Props {
  size?: number;
  opacity?: number;
  /** corner position — drives which quadrant the motif faces */
  corner?: "tr" | "tl" | "br" | "bl";
  className?: string;
  gold?: boolean; // true = gold, false = blue-tinted
}

export const HeritageMotif: React.FC<Props> = memo(({
  size = 80,
  opacity = 0.18,
  corner = "tr",
  className = "",
  gold = true,
}) => {
  const color = gold ? "#D4AF37" : "#2563EB";
  const cx = size / 2;
  const cy = size / 2;
  const R  = size * 0.44;   // outer ring radius
  const r  = size * 0.22;   // inner ring radius
  const spokes = 24;        // 24 spokes = Ashoka chakra symbolism (not the emblem)

  // Rotation for each corner so the motif always "points inward"
  const rotation = { tr: 45, tl: -45, br: 135, bl: -135 }[corner];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ opacity, flexShrink: 0 }}
      aria-hidden="true"
      role="img"
    >
      <g transform={`rotate(${rotation}, ${cx}, ${cy})`}>
        {/* Outer decorative ring */}
        <circle cx={cx} cy={cy} r={R} fill="none"
          stroke={color} strokeWidth={size * 0.012} strokeDasharray={`${size*0.04} ${size*0.02}`} />

        {/* Inner solid ring */}
        <circle cx={cx} cy={cy} r={r * 0.42} fill="none"
          stroke={color} strokeWidth={size * 0.018} />

        {/* 24 geometric spokes */}
        {Array.from({ length: spokes }).map((_, i) => {
          const a = (i / spokes) * Math.PI * 2;
          const x1 = cx + Math.cos(a) * r * 0.52;
          const y1 = cy + Math.sin(a) * r * 0.52;
          const x2 = cx + Math.cos(a) * R * 0.88;
          const y2 = cy + Math.sin(a) * R * 0.88;
          // Every 6th spoke is slightly thicker (pillar effect)
          const thick = i % 6 === 0;
          return (
            <line key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={color}
              strokeWidth={thick ? size * 0.022 : size * 0.009}
              strokeLinecap="round"
            />
          );
        })}

        {/* Diamond tip at the top — pillar capital motif */}
        <polygon
          points={`${cx},${cy - R * 1.12} ${cx - size*0.055},${cy - R*0.88} ${cx},${cy - R*0.75} ${cx + size*0.055},${cy - R*0.88}`}
          fill={color}
          opacity={0.85}
        />

        {/* Corner bracket lines — architectural feel */}
        <line x1={cx - size*0.3} y1={cy - R*1.08} x2={cx - size*0.45} y2={cy - R*1.08}
          stroke={color} strokeWidth={size*0.012} strokeLinecap="round" />
        <line x1={cx + size*0.3} y1={cy - R*1.08} x2={cx + size*0.45} y2={cy - R*1.08}
          stroke={color} strokeWidth={size*0.012} strokeLinecap="round" />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={size * 0.045} fill={color} opacity={0.9} />
      </g>
    </svg>
  );
});

HeritageMotif.displayName = "HeritageMotif";

/**
 * PageHeritageAccent – Positions the motif in a page corner.
 * Fixed position, pointer-events-none. Drop into any page wrapper.
 */
export const PageHeritageAccent: React.FC<{
  corner?: "tr" | "tl" | "br" | "bl";
  size?: number;
  opacity?: number;
  gold?: boolean;
}> = ({ corner = "tr", size = 96, opacity = 0.14, gold = true }) => {
  const posClass = {
    tr: "top-0 right-0",
    tl: "top-0 left-0",
    br: "bottom-0 right-0",
    bl: "bottom-0 left-0",
  }[corner];

  return (
    <div className={`absolute ${posClass} pointer-events-none z-0`} aria-hidden="true">
      <HeritageMotif size={size} opacity={opacity} corner={corner} gold={gold} />
    </div>
  );
};
