import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useState,
} from "react";

export type ThemeMode = "light" | "dark";

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("sentinel_theme");
      if (saved === "light" || saved === "dark") return saved;
    } catch {}
    return "dark";
  });

  // Stable reference — does not change between renders
  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem("sentinel_theme", mode);
    } catch {}
  }, []);

  // Stable reference — depends only on setThemeMode (itself stable)
  const toggleTheme = useCallback(() => {
    setThemeModeState(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try { localStorage.setItem("sentinel_theme", next); } catch {}
      return next;
    });
  }, []);

  // Apply class to <html> element — runs only when themeMode changes
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
  }, [themeMode]);

  // Memoized context value — only changes when themeMode changes
  const value = useMemo<ThemeContextType>(
    () => ({ themeMode, toggleTheme, setThemeMode }),
    [themeMode, toggleTheme, setThemeMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Safe fallback outside provider
    return {
      themeMode: "dark",
      toggleTheme: () => {},
      setThemeMode: () => {},
    };
  }
  return context;
};
