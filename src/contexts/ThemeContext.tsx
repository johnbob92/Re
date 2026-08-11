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

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode === "auto") return isNightLocal() ? "dark" : "light";
  return mode;
}

function applyToDocument(mode: ThemeMode, colorTheme: ColorTheme) {
  if (typeof document === "undefined") return;
  const next = resolveMode(mode);
  document.documentElement.dataset.theme = next;
  document.documentElement.dataset.color = colorTheme;
  document.documentElement.classList.toggle("dark", next === "dark");
  return next;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // SSR + first client paint use stable defaults to avoid hydration mismatch.
  // localStorage is applied after mount (and also by the layout boot script).
  const [mode, setModeState] = useState<ThemeMode>("auto");
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("ocean");
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedMode = readStoredMode();
    const storedColor = readStoredColor();
    setModeState(storedMode);
    setColorThemeState(storedColor);
    const next = applyToDocument(storedMode, storedColor) || "light";
    setResolvedMode(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const compute = () => {
      const next = applyToDocument(mode, colorTheme) || "light";
      setResolvedMode(next);
    };
    compute();
    const id = window.setInterval(compute, 60_000);
    return () => window.clearInterval(id);
  }, [mode, colorTheme, ready]);

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
