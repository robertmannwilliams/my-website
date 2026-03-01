"use client";

import { useEffect, useState } from "react";

const DARK_THEMES = [
  { background: "#244466", foreground: "#f5dcc8" },
  { background: "#344a34", foreground: "#f5dcc8" },
];

function pickRandomTheme() {
  return DARK_THEMES[Math.floor(Math.random() * DARK_THEMES.length)];
}

function applyDark() {
  const theme = pickRandomTheme();
  document.documentElement.style.setProperty("--background", theme.background);
  document.documentElement.style.setProperty("--foreground", theme.foreground);
  document.documentElement.classList.add("dark");
}

function applyLight() {
  document.documentElement.style.setProperty("--background", "#f5f0eb");
  document.documentElement.style.setProperty("--foreground", "#1a1816");
  document.documentElement.classList.remove("dark");
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const isDark = saved === "dark";
    setDark(isDark);
    if (isDark) applyDark();
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) {
      applyDark();
      localStorage.setItem("theme", "dark");
    } else {
      applyLight();
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        position: "fixed",
        bottom: "1.5rem",
        right: "1.5rem",
        zIndex: 50,
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        border: "1px solid var(--foreground)",
        background: "transparent",
        color: "var(--foreground)",
        cursor: "pointer",
        opacity: 0.3,
        transition: "opacity 0.3s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "14px",
        padding: 0,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.3")}
    >
      {dark ? "\u2600" : "\u263E"}
    </button>
  );
}
