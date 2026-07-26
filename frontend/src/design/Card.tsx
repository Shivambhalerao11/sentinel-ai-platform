import React, { memo } from "react";

type CardVariant = "default" | "elevated" | "glass" | "command" | "critical" | "gold";

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  dark?: boolean;
}

const VARIANT_STYLES: Record<CardVariant, { light: string; dark: string }> = {
  default: {
    light: "bg-white border border-[#E2E8F0] shadow-[0_2px_12px_rgba(7,17,30,0.07)] text-[#0F172A]",
    dark:  "bg-[#0F2340] border border-[rgba(255,255,255,0.07)] shadow-[0_4px_24px_rgba(0,0,0,0.4)] text-white",
  },
  elevated: {
    light: "bg-white border border-[#E2E8F0] shadow-[0_4px_20px_rgba(7,17,30,0.1)] text-[#0F172A]",
    dark:  "bg-[#132440] border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white",
  },
  glass: {
    light: "bg-white/80 backdrop-blur-xl border border-white/60 shadow-[0_4px_20px_rgba(7,17,30,0.08)] text-[#0F172A]",
    dark:  "bg-[rgba(7,17,30,0.6)] backdrop-blur-xl border border-[rgba(255,255,255,0.07)] shadow-[0_8px_32px_rgba(0,0,0,0.4)] text-white",
  },
  command: {
    light: "bg-[#163A70] border border-[#1E4A8A] shadow-[0_4px_20px_rgba(22,58,112,0.25)] text-white",
    dark:  "bg-[#0F2340] border border-[#1E4A8A] shadow-[0_8px_32px_rgba(0,0,0,0.5)] text-white",
  },
  critical: {
    light: "bg-red-50 border-l-4 border border-red-500 shadow-[0_2px_12px_rgba(220,38,38,0.1)] text-[#0F172A]",
    dark:  "bg-red-950/40 border-l-4 border border-red-700 shadow-[0_4px_20px_rgba(220,38,38,0.15)] text-white",
  },
  gold: {
    light: "bg-amber-50/60 border border-amber-200/80 shadow-[0_2px_12px_rgba(212,175,55,0.12)] text-[#0F172A]",
    dark:  "bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.18)] shadow-[0_4px_20px_rgba(212,175,55,0.1)] text-white",
  },
};

const PADDING_STYLES = {
  none: "",
  sm:   "p-3",
  md:   "p-4 md:p-5",
  lg:   "p-5 md:p-6",
};

/**
 * Card — no useTheme() call here.
 * Caller always passes `dark` prop explicitly, so context subscription is unnecessary.
 * This prevents every Card from re-rendering on theme change.
 */
export const Card: React.FC<CardProps> = memo(({
  children, variant = "default", className = "",
  onClick, hover = !!onClick, padding = "md", dark = false,
}) => {
  const variantClass = VARIANT_STYLES[variant][dark ? "dark" : "light"];
  const paddingClass = PADDING_STYLES[padding];
  const hoverClass   = hover
    ? "transition-all duration-200 cursor-pointer hover:scale-[1.01] hover:shadow-[0_8px_32px_rgba(7,17,30,0.14)]"
    : "transition-all duration-200";

  return (
    <div
      className={`rounded-2xl overflow-hidden ${variantClass} ${paddingClass} ${hoverClass} ${className}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      {children}
    </div>
  );
});

Card.displayName = "Card";

/**
 * SectionHeader — accepts dark prop directly, no context subscription.
 */
export const SectionHeader: React.FC<{
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  dark?: boolean;
}> = memo(({ icon, title, subtitle, action, dark = false }) => (
  <div
    className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-5 border-b"
    style={{ borderColor: dark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }}
  >
    <div className="flex items-center space-x-2.5">
      {icon && (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: dark ? "rgba(212,175,55,0.12)" : "rgba(22,58,112,0.08)" }}
        >
          {icon}
        </div>
      )}
      <div>
        <h1 className={`text-base font-black uppercase tracking-tight font-sans ${dark ? "text-white" : "text-[#0F172A]"}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`text-[11px] font-mono mt-0.5 ${dark ? "text-slate-400" : "text-[#475569]"}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
));

SectionHeader.displayName = "SectionHeader";

/**
 * KpiCard — accepts dark prop directly, no context subscription.
 */
export const KpiCard: React.FC<{
  label: string;
  value: string | number;
  sub?: string;
  accent?: "blue" | "red" | "green" | "gold" | "neutral";
  dark?: boolean;
}> = memo(({ label, value, sub, accent = "neutral", dark = false }) => {
  const accentColors = {
    blue:    { border: "#2563EB", text: "#163A70", bg: "#EFF6FF" },
    red:     { border: "#DC2626", text: "#DC2626", bg: "#FEF2F2" },
    green:   { border: "#16A34A", text: "#16A34A", bg: "#F0FDF4" },
    gold:    { border: "#D4AF37", text: "#8B6914", bg: "rgba(212,175,55,0.08)" },
    neutral: { border: "#E2E8F0", text: "#163A70", bg: "white" },
  }[accent];

  return (
    <div
      className={`rounded-2xl overflow-hidden p-4 border-l-4 transition-all duration-200 ${dark ? "bg-[#0F2340] border border-r border-t border-b" : "bg-white border border-r border-t border-b"}`}
      style={{
        borderLeftColor:   accentColors.border,
        borderRightColor:  dark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
        borderTopColor:    dark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
        borderBottomColor: dark ? "rgba(255,255,255,0.07)" : "#E2E8F0",
        background: dark ? undefined : accentColors.bg,
        boxShadow: "0 2px 12px rgba(7,17,30,0.07)",
      }}
    >
      <p className={`text-[10px] uppercase font-bold tracking-widest font-mono ${dark ? "text-slate-400" : "text-[#475569]"}`}>
        {label}
      </p>
      <div className="flex items-baseline space-x-2 mt-1.5">
        <span
          className="text-2xl font-black font-mono tabular-nums"
          style={{ color: dark ? "white" : accentColors.text }}
        >
          {value}
        </span>
        {sub && (
          <span className={`text-[11px] font-bold font-mono ${dark ? "text-slate-400" : "text-[#64748B]"}`}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
});

KpiCard.displayName = "KpiCard";
