"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./auth-context";
import type { ColorThemeKey } from "@/lib/constants";

type ColorTheme = ColorThemeKey;

interface ThemeContextValue {
  colorTheme: ColorThemeKey;
  darkMode: boolean;
  setColorTheme: (t: ColorThemeKey) => Promise<void>;
  toggleDarkMode: () => Promise<void>;
  setDarkMode: (v: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_THEME = "techadox_color_theme";
const STORAGE_DARK = "techadox_dark_mode";

function applyTheme(colorTheme: ColorThemeKey, darkMode: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", colorTheme);
  root.classList.toggle("dark", darkMode);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, refresh } = useAuth();
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>("teal");
  const [darkMode, setDarkModeState] = useState<boolean>(false);

  // initialize from user prefs (when logged in) or localStorage
  useEffect(() => {
    let initialTheme: ColorTheme = (localStorage.getItem(STORAGE_THEME) as ColorThemeKey) || "teal";
    let initialDark = localStorage.getItem(STORAGE_DARK) === "true";
    if (user) {
      initialTheme = (user.colorTheme as ColorThemeKey) || "teal";
      initialDark = !!user.darkMode;
    }
    applyTheme(initialTheme, initialDark);
    // Sync theme state after DOM update (initialization pattern)
    queueMicrotask(() => { setColorThemeState(initialTheme); setDarkModeState(initialDark); });
  }, [user]);

  const persist = useCallback(async (theme: ColorThemeKey, dark: boolean) => {
    localStorage.setItem(STORAGE_THEME, theme);
    localStorage.setItem(STORAGE_DARK, String(dark));
    applyTheme(theme, dark);
    // persist to server if logged in
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ colorTheme: theme, darkMode: dark }),
      });
    } catch {
      /* ignore */
    }
  }, []);

  const setColorTheme = useCallback(
    async (t: ColorThemeKey) => {
      setColorThemeState(t);
      await persist(t, darkMode);
      refresh();
    },
    [darkMode, persist, refresh]
  );

  const setDarkMode = useCallback(
    async (v: boolean) => {
      setDarkModeState(v);
      await persist(colorTheme, v);
      refresh();
    },
    [colorTheme, persist, refresh]
  );

  const toggleDarkMode = useCallback(async () => {
    const next = !darkMode;
    setDarkModeState(next);
    await persist(colorTheme, next);
    refresh();
  }, [darkMode, colorTheme, persist, refresh]);

  return (
    <ThemeContext.Provider value={{ colorTheme, darkMode, setColorTheme, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
