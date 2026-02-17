"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = localStorage.getItem("brainbolt-theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored ?? (prefersDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", initial);
    setTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("brainbolt-theme", next);
    setTheme(next);
  };

  return (
    <button className="plain-btn" onClick={toggle}>
      {theme === "dark" ? "☀️ Light" : "🌙 Dark"}
    </button>
  );
}
