/**
 * PageShell – Unified page wrapper applied to every main content page.
 * Provides:
 *   • Consistent background (light/dark aware)
 *   • Heritage motif corners
 *   • Subtle background grid pattern
 *   • Page-entry animation
 *   • Consistent max-width + padding
 */
import React, { memo } from "react";
import { motion } from "motion/react";
import { PageHeritageAccent } from "./HeritageMotif";
import { useTheme } from "../context/ThemeContext";

interface PageShellProps {
  children: React.ReactNode;
  /** Show both TR and BL corner motifs */
  motifs?: boolean;
  /** Override max-width (default 1600px) */
  maxWidth?: string;
  /** Pass themeMode from App */
  dark?: boolean;
  /** Disable the subtle grid */
  noGrid?: boolean;
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = memo(({
  children,
  motifs = true,
  maxWidth = "1600px",
  dark,
  noGrid = false,
  className = "",
}) => {
  const { themeMode } = useTheme();
  const isDark = dark !== undefined ? dark : themeMode === "dark";

  return (
    <motion.div
      className={`relative min-h-full w-full overflow-hidden ${className}`}
      style={{
        background: isDark
          ? "radial-gradient(ellipse 90% 60% at 50% 0%, #0F2340 0%, #0B1A2F 40%, #07111E 100%)"
          : "radial-gradient(ellipse 80% 50% at 50% 0%, #EEF3FF 0%, #F8FAFC 60%, #F1F5F9 100%)",
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Subtle background grid — always present, very faint */}
      {!noGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: isDark
              ? "linear-gradient(rgba(37,99,235,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.04) 1px,transparent 1px)"
              : "linear-gradient(rgba(22,58,112,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(22,58,112,0.04) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      )}

      {/* Heritage motif corners */}
      {motifs && (
        <>
          <PageHeritageAccent corner="tr" size={100} opacity={isDark ? 0.12 : 0.1} gold />
          <PageHeritageAccent corner="bl" size={80}  opacity={isDark ? 0.08 : 0.07} gold={!isDark} />
        </>
      )}

      {/* Page content */}
      <div
        className="relative z-10 p-4 md:p-6 mx-auto"
        style={{ maxWidth }}
      >
        {children}
      </div>
    </motion.div>
  );
});

PageShell.displayName = "PageShell";
