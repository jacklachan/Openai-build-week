"use client";

import { useState } from "react";

const themeStorageKey = "tessera-theme";
type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  const storedTheme = localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "light" : getPreferredTheme(),
  );

  function toggleTheme() {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem(themeStorageKey, nextTheme);
    setTheme(nextTheme);
  }

  return (
    <button
      aria-label="Toggle color theme"
      className="themeToggle"
      onClick={toggleTheme}
      type="button"
    >
      Theme
    </button>
  );
}
