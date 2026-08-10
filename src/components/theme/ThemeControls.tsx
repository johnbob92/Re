"use client";

import { Moon, Sun, Palette } from "lucide-react";
import { COLOR_THEMES, useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

const labels: Record<string, string> = {
  ocean: "Ocean",
  violet: "Violet",
  emerald: "Emerald",
  sunset: "Sunset",
  rose: "Rose",
  slate: "Slate",
};

export function ThemeControls() {
  const { resolvedMode, toggleMode, colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleMode}
        aria-label="Toggle dark/light mode"
        title={resolvedMode === "dark" ? "Switch to bright mode" : "Switch to dark mode"}
      >
        {resolvedMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        <span className="hidden sm:inline">{resolvedMode === "dark" ? "Bright" : "Dark"}</span>
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="Color themes"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">{labels[colorTheme]}</span>
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-40 w-56 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
          <p className="mb-2 text-xs font-medium text-[var(--muted)]">Color styles</p>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme}
                onClick={() => {
                  setColorTheme(theme);
                  setOpen(false);
                }}
                className={`rounded-xl border px-2 py-2 text-left text-xs capitalize transition ${
                  colorTheme === theme
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span
                  className="mb-1 block h-2 w-full rounded-full"
                  style={{ background: `var(--swatch-${theme})` }}
                />
                {labels[theme]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
