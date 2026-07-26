import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "../types";
import {
  apiClient,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  USER_KEY,
} from "../services/apiClient";
import { API_ENDPOINTS } from "../constants/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: {
    identifier?: string;
    email?: string;
    password?: string;
    role?: string;
    badgeNumber?: string;
  }) => Promise<User>;
  register: (payload: any) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY);

      if (storedToken) {
        try {
          const res = await apiClient.get(API_ENDPOINTS.ME);
          setUser(res.data);
          localStorage.setItem(USER_KEY, JSON.stringify(res.data));
        } catch (err) {
          console.warn("Session verification warning:", err);
        }
      }

      setIsLoading(false);
    };

    initAuth();

    const handleSessionExpired = () => {
      setUser(null);
      setToken(null);

      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    };

    window.addEventListener(
      "sentinel_session_expired",
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        "sentinel_session_expired",
        handleSessionExpired
      );
    };
  }, []);

  // ==========================
  // LOGIN
  // ==========================
  const login = async (credentials: {
    identifier?: string;
    email?: string;
    password?: string;
    role?: string;
    badgeNumber?: string;
  }): Promise<User> => {
    const isPolice =
      credentials.role === "police_admin" ||
      credentials.role === "police_officer" ||
      credentials.role === "police";

    const endpoint = isPolice
      ? API_ENDPOINTS.POLICE_LOGIN
      : API_ENDPOINTS.CITIZEN_LOGIN;

    const response = await apiClient.post(endpoint, {
      identifier: credentials.identifier || credentials.email,
      password: credentials.password,
    });

    // Backend returns: { tokens: { access_token, refresh_token, ... }, user: {...} }
    const { tokens, user: loggedUser } = response.data;

    if (tokens?.access_token) {
      setToken(tokens.access_token);
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    }

    if (tokens?.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }

    if (loggedUser) {
      setUser(loggedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
    }

    return loggedUser;
  };

  // ==========================
  // REGISTER
  // ==========================
  const register = async (payload: any): Promise<User> => {
    // Only citizen self-registration is permitted
    const endpoint = API_ENDPOINTS.CITIZEN_REGISTER;

    const response = await apiClient.post(endpoint, payload);

    // Backend returns LoginResponse: { tokens: { access_token, refresh_token, ... }, user: {...} }
    const { tokens, user: registeredUser } = response.data;

    if (tokens?.access_token) {
      setToken(tokens.access_token);
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    }

    if (tokens?.refresh_token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
    }

    if (registeredUser) {
      setUser(registeredUser);
      localStorage.setItem(USER_KEY, JSON.stringify(registeredUser));
    }

    return registeredUser || response.data;
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);

    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};
