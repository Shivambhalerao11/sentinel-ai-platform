import React, { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldCheck, RefreshCw, X, AlertCircle, CheckCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface Props {
  email: string;
  purpose: "REGISTRATION" | "PASSWORD_RESET";
  isOpen: boolean;
  onClose: () => void;
  onVerify: (otpCode: string) => Promise<void>;
  onResend: () => Promise<void>;
  initialDebugOtp?: string;
}

export const OtpVerificationModal: React.FC<Props> = memo(({
  email,
  purpose,
  isOpen,
  onClose,
  onVerify,
  onResend,
  initialDebugOtp,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === "dark";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(300); // 5 minutes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 5-minute countdown timer
  useEffect(() => {
    if (!isOpen) return;
    setTimerSeconds(300);
    const interval = setInterval(() => {
      setTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Fill debug OTP in dev mode if provided
  useEffect(() => {
    if (initialDebugOtp && initialDebugOtp.length === 6) {
      setDigits(initialDebugOtp.split(""));
    }
  }, [initialDebugOtp]);

  const handleChange = (index: number, value: string) => {
    setErrorMessage("");
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);

    // Auto-advance to next box
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = digits.join("");
    if (otpCode.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit OTP code.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    try {
      await onVerify(otpCode);
      setSuccessMessage("OTP verified successfully!");
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid or expired OTP code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendClick = async () => {
    setResending(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await onResend();
      setTimerSeconds(300);
      setDigits(["", "", "", "", "", ""]);
      setSuccessMessage("New 6-digit OTP code sent to your email.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="fixed inset-0"
          style={{
            background: isDark ? "rgba(0,8,16,0.85)" : "rgba(15,23,42,0.6)",
            backdropFilter: "blur(12px)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 md:p-8"
          style={{
            background: isDark
              ? "linear-gradient(135deg, rgba(15,35,75,0.98) 0%, rgba(8,20,50,0.99) 100%)"
              : "#FFFFFF",
            border: isDark
              ? "1px solid rgba(212,175,55,0.25)"
              : "1px solid rgba(22,58,112,0.18)",
          }}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: isDark ? "rgba(212,175,55,0.15)" : "rgba(37,99,235,0.1)",
                  border: isDark ? "1px solid rgba(212,175,55,0.3)" : "1px solid rgba(37,99,235,0.2)",
                }}
              >
                <ShieldCheck className={`w-5 h-5 ${isDark ? "text-amber-400" : "text-[#163A70]"}`} />
              </div>
              <div>
                <h3 className={`text-base font-black uppercase tracking-wide ${isDark ? "text-white" : "text-[#0F172A]"}`}>
                  {purpose === "REGISTRATION" ? "Email OTP Verification" : "Password Reset OTP"}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Code sent to <span className={isDark ? "text-amber-300 font-bold" : "text-[#163A70] font-bold"}>{email}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback Banners */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-2 text-xs text-red-400 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start space-x-2 text-xs text-emerald-400 font-mono">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 6-Digit Inputs */}
            <div className="flex justify-between gap-2 my-4">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 text-center text-xl font-bold font-mono rounded-xl border focus:outline-none transition-all ${
                    isDark
                      ? "bg-white/5 border-white/15 text-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#163A70] focus:ring-2 focus:ring-[#163A70]/20"
                  }`}
                />
              ))}
            </div>

            {/* Timer & Resend */}
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span>OTP expires in:</span>
                <span className={`font-bold ${timerSeconds < 60 ? "text-red-400" : isDark ? "text-amber-300" : "text-[#163A70]"}`}>
                  {formatTimer(timerSeconds)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleResendClick}
                disabled={resending || timerSeconds > 240}
                className="flex items-center space-x-1 text-xs font-bold text-blue-400 hover:text-blue-300 disabled:opacity-40 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`} />
                <span>Resend OTP</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || digits.join("").length !== 6}
              className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 transition-all shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "#FFFFFF",
              }}
            >
              {loading ? (
                <span className="animate-pulse">Verifying Code...</span>
              ) : (
                <span>Confirm & Activate Account</span>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

OtpVerificationModal.displayName = "OtpVerificationModal";
