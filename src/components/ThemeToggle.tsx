"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "libris-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored =
      (window.localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null) ??
      "light";
    setTheme(stored);
    document.documentElement.dataset.theme = stored;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      type="button"
      className="btn-ghost text-sm"
      onClick={toggleTheme}
      aria-label="Basculer le theme"
    >
      {theme === "light" ? "Nuit" : "Jour"}
    </button>
  );
}
