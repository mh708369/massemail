"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Default to light. If user had dark stored before the light-mode migration,
    // reset to light. They can re-enable dark via the toggle in the sidebar.
    const stored = (typeof window !== "undefined" ? localStorage.getItem("theme") : null) as Theme | null;
    const migrated = typeof window !== "undefined" ? localStorage.getItem("theme-v2") : null;
    let initial: Theme = "light";
    if (migrated && stored === "dark") {
      initial = "dark"; // User actively chose dark after the migration
    } else if (!migrated) {
      // First run after migration — force light, mark as migrated
      initial = "light";
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", "light");
        localStorage.setItem("theme-v2", "1");
      }
    } else {
      initial = stored === "dark" ? "dark" : "light";
    }
    setTheme(initial);
    applyTheme(initial);
  }, []);

  function applyTheme(t: Theme) {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(t);
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    if (typeof window !== "undefined") localStorage.setItem("theme", next);
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
