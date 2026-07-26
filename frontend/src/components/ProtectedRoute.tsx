import React from "react";
import { useAuth } from "../context/AuthContext";
import { AuthScreen } from "./AuthScreen";

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B172A] text-slate-100">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono tracking-widest uppercase text-slate-400">
            AUTHENTICATING SENTINEL SESSION...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return fallback ? <>{fallback}</> : <AuthScreen onLoginSuccess={() => {}} />;
  }

  return <>{children}</>;
};
