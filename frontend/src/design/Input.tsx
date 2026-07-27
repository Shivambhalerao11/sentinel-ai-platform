/**
 * Input – Unified form controls with consistent focus/hover states.
 */
import React, { memo } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  dark?: boolean;
}

export const Input: React.FC<InputProps> = memo(({
  label, error, icon, dark = false, className = "", ...rest
}) => (
  <div className="space-y-1.5">
    {label && (
      <label className={`block text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#475569]"}`}>
        {label}
      </label>
    )}
    <div className="relative">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
          {icon}
        </div>
      )}
      <input
        {...rest}
        className={[
          "w-full rounded-xl text-xs font-medium transition-all duration-200 ds-input",
          "focus:outline-none focus:ring-2 caret-[#D4AF37] selection:bg-[#163A70] selection:text-white",
          icon ? "pl-9 pr-3" : "px-3",
          "py-2.5",
          dark
            ? "input-dark bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#94A3B8] focus:border-[#D4AF37] focus:ring-[rgba(212,175,55,0.22)]"
            : "input-light bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] placeholder-[#64748B] focus:border-[#163A70] focus:ring-[rgba(22,58,112,0.18)]",
          error ? "border-red-500! focus:border-red-500! focus:ring-red-200!" : "",
          className,
        ].filter(Boolean).join(" ")}
      />
    </div>
    {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
  </div>
));
Input.displayName = "Input";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  dark?: boolean;
  variant?: "default" | "light" | "dark";
  icon?: React.ReactNode;
  error?: string;
  containerClassName?: string;
}

export const Select: React.FC<SelectProps> = memo(({
  label,
  dark = false,
  variant,
  icon,
  error,
  className = "",
  containerClassName = "",
  children,
  ...rest
}) => {
  const isLight = variant === "light" || (!dark && variant !== "dark");

  return (
    <div className={`space-y-1.5 ${containerClassName}`}>
      {label && (
        <label className={`block text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#475569]"}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37] pointer-events-none z-10">
            {icon}
          </div>
        )}
        <select
          {...rest}
          className={[
            "w-full text-xs font-medium ds-select",
            isLight ? "select-light" : "select-dark",
            icon ? "pl-9 pr-8" : "px-3 pr-8",
            "py-2.5",
            error ? "border-red-500! focus:border-red-500!" : "",
            className,
          ].filter(Boolean).join(" ")}
        >
          {children}
        </select>
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
});
Select.displayName = "Select";

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string; dark?: boolean;
}> = memo(({ label, dark = false, className = "", ...rest }) => (
  <div className="space-y-1.5">
    {label && (
      <label className={`block text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-[#475569]"}`}>
        {label}
      </label>
    )}
    <textarea
      {...rest}
      className={[
        "w-full rounded-xl text-xs font-medium px-3 py-2.5 transition-all duration-200 resize-none ds-input",
        "focus:outline-none focus:ring-2 caret-[#D4AF37] selection:bg-[#163A70] selection:text-white",
        dark
          ? "input-dark bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#94A3B8] focus:border-[#D4AF37] focus:ring-[rgba(212,175,55,0.22)]"
          : "input-light bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] placeholder-[#64748B] focus:border-[#163A70] focus:ring-[rgba(22,58,112,0.18)]",
        className,
      ].filter(Boolean).join(" ")}
    />
  </div>
));
Textarea.displayName = "Textarea";
