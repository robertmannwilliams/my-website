"use client";

import { useEffect, useState } from "react";

function applyDark() {
  document.documentElement.style.setProperty("--background", "#344a34");
  document.documentElement.style.setProperty("--foreground", "#f5dcc8");
  document.documentElement.classList.add("dark");
}

function applyLight() {
  document.documentElement.style.setProperty("--background", "#f5dcc8");
  document.documentElement.style.setProperty("--foreground", "#344a34");
  document.documentElement.classList.remove("dark");
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    // Default to dark if no preference saved
    const isDark = saved !== "light";
    setDark(isDark);
    if (isDark) applyDark();
    else applyLight();
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
        top: "1.5rem",
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
      {dark ? "\u2600\uFE0E" : "\u263E"}
    </button>
  );
}
