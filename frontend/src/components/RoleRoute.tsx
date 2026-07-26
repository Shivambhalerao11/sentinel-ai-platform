import React from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

interface RoleRouteProps {
  allowedRoles: Array<"citizen" | "police_officer" | "police_admin" | "super_admin">;
  children: React.ReactNode;
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B172A] p-6 text-slate-100">
        <div className="max-w-md w-full p-8 rounded-2xl bg-rose-950/40 border border-rose-800/60 backdrop-blur-xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-900/60 border border-rose-500 flex items-center justify-center mx-auto text-rose-400">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold uppercase tracking-wider text-rose-300">
            ACCESS DENIED - RESTRICTED ZONE
          </h2>
          <p className="text-xs text-rose-200/80 leading-relaxed">
            Your user role <span className="font-mono bg-rose-900/80 px-2 py-0.5 rounded text-rose-100 uppercase">{user?.role || "GUEST"}</span> does not possess clearance for this module under BNS Security Protocols.
          </p>
          <div className="pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-all shadow-lg"
            >
              Return to Authorized Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
