/**
 * Button – Unified button system with premium hover/active states.
 * Variants: primary (navy), gold, danger (red), ghost, outline
 */
import React, { memo } from "react";

type ButtonVariant = "primary" | "gold" | "danger" | "ghost" | "outline" | "emerald";
type ButtonSize    = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: [
    "bg-[#163A70] text-white",
    "hover:bg-[#1E4A8A]",
    "active:bg-[#0F2340]",
    "shadow-[0_2px_12px_rgba(22,58,112,0.25)]",
    "hover:shadow-[0_4px_20px_rgba(22,58,112,0.35)]",
    "border border-[#1E4A8A]",
  ].join(" "),
  gold: [
    "text-[#0F172A] font-black",
    "border border-[#D4AF37]",
    "hover:brightness-105",
    "active:brightness-95",
    "shadow-[0_2px_12px_rgba(212,175,55,0.3)]",
    "hover:shadow-[0_4px_20px_rgba(212,175,55,0.45)]",
  ].join(" "),
  danger: [
    "bg-[#DC2626] text-white",
    "hover:bg-[#B91C1C]",
    "active:bg-[#991B1B]",
    "shadow-[0_2px_8px_rgba(220,38,38,0.25)]",
    "border border-red-700",
  ].join(" "),
  emerald: [
    "bg-[#059669] text-white",
    "hover:bg-[#047857]",
    "active:bg-[#065F46]",
    "shadow-[0_2px_8px_rgba(5,150,105,0.25)]",
    "border border-emerald-700",
  ].join(" "),
  ghost: [
    "text-[#163A70] bg-transparent",
    "hover:bg-[#163A70]/8",
    "active:bg-[#163A70]/12",
    "border border-transparent",
  ].join(" "),
  outline: [
    "bg-transparent text-[#163A70]",
    "hover:bg-[#163A70] hover:text-white",
    "active:bg-[#0F2340]",
    "border border-[#163A70]",
    "transition-colors",
  ].join(" "),
};

const SIZE: Record<ButtonSize, string> = {
  xs: "px-2.5 py-1   text-[10px] rounded-lg  gap-1",
  sm: "px-3.5 py-1.5 text-xs    rounded-xl  gap-1.5",
  md: "px-5   py-2.5 text-xs    rounded-xl  gap-2",
  lg: "px-6   py-3   text-sm    rounded-2xl gap-2.5",
};

export const Button: React.FC<ButtonProps> = memo(({
  variant = "primary", size = "md",
  icon, iconRight, loading = false, fullWidth = false,
  children, disabled, className = "", style,
  ...rest
}) => {
  const isGold = variant === "gold";
  const goldStyle = isGold ? {
    background: "linear-gradient(135deg, #8B6914 0%, #D4AF37 40%, #F5E27A 60%, #D4AF37 80%, #8B6914 100%)",
    ...style,
  } : style;

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={goldStyle}
      className={[
        "inline-flex items-center justify-center",
        "font-bold uppercase tracking-wider",
        "transition-all duration-200",
        "cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50",
        "disabled:opacity-50 disabled:pointer-events-none",
        VARIANT[variant],
        SIZE[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  );
});

Button.displayName = "Button";

/**
 * IconButton – Square icon-only button
 */
export const IconButton: React.FC<{
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  variant?: "ghost" | "filled";
  className?: string;
}> = ({ icon, onClick, title, active, variant = "ghost", className = "" }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={[
      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer",
      variant === "ghost"
        ? active
          ? "bg-[#163A70] text-white"
          : "text-[#475569] hover:bg-[#163A70]/8 hover:text-[#163A70]"
        : active
          ? "bg-[#163A70] text-white shadow-sm"
          : "bg-white border border-[#E2E8F0] text-[#475569] hover:border-[#163A70] hover:text-[#163A70]",
      className,
    ].join(" ")}
  >
    {icon}
  </button>
);

/**
 * StatusBadge – Priority / status indicator badge
 */
export const StatusBadge: React.FC<{
  label: string;
  type?: "critical" | "high" | "routine" | "resolved" | "pending" | "neutral" | "ai";
  size?: "xs" | "sm";
}> = ({ label, type = "neutral", size = "xs" }) => {
  const styles = {
    critical: "bg-red-600    text-white",
    high:     "bg-amber-600  text-white",
    routine:  "bg-blue-600   text-white",
    resolved: "bg-emerald-600 text-white",
    pending:  "bg-slate-500  text-white",
    ai:       "bg-cyan-500   text-slate-950",
    neutral:  "bg-slate-200  text-slate-800",
  }[type];
  const sz = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-1";
  return (
    <span className={`${styles} ${sz} rounded font-black uppercase tracking-wider font-mono inline-block`}>
      {label}
    </span>
  );
};
