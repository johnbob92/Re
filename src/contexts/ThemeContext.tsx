"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ColorTheme, ThemeMode } from "@/types";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  colorTheme: ColorTheme;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COLOR_THEMES: ColorTheme[] = [
  "ocean",
  "violet",
  "emerald",
  "sunset",
  "rose",
  "slate",
];

function isNightLocal(date = new Date()) {
  const hour = date.getHours();
  return hour >= 19 || hour < 7;
}

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  return (localStorage.getItem("hireflow-mode") as ThemeMode) || "auto";
}

function readStoredColor(): ColorTheme {
  if (typeof window === "undefined") return "ocean";
  const saved = localStorage.getItem("hireflow-color") as ColorTheme | null;
  return saved && COLOR_THEMES.includes(saved) ? saved : "ocean";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(readStoredColor);
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() =>
    mode === "auto" ? (isNightLocal() ? "dark" : "light") : mode
  );

  useEffect(() => {
    const compute = () => {
      const next =
        mode === "auto" ? (isNightLocal() ? "dark" : "light") : mode;
      setResolvedMode(next);
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.color = colorTheme;
      document.documentElement.classList.toggle("dark", next === "dark");
    };

    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [mode, colorTheme]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem("hireflow-mode", next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(resolvedMode === "dark" ? "light" : "dark");
  }, [resolvedMode, setMode]);

  const setColorTheme = useCallback((theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem("hireflow-color", theme);
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedMode, colorTheme, setMode, toggleMode, setColorTheme }),
    [mode, resolvedMode, colorTheme, setMode, toggleMode, setColorTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export { COLOR_THEMES };
