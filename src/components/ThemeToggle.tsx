"use client";

import { useEffect, useSyncExternalStore } from "react";

type ThemeName = "dark" | "light";

const THEME_EVENT = "rw-theme-change";

function getServerSnapshot(): ThemeName {
  return "dark";
}

function getSnapshot(): ThemeName {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  return () => window.removeEventListener(THEME_EVENT, callback);
}

function applyTheme(theme: ThemeName, persist = true) {
  document.documentElement.style.setProperty(
    "--background",
    theme === "dark" ? "#344a34" : "#f5dcc8",
  );
  document.documentElement.style.setProperty(
    "--foreground",
    theme === "dark" ? "#f5dcc8" : "#344a34",
  );
  document.documentElement.classList.toggle("dark", theme === "dark");

  if (persist) {
    localStorage.setItem("theme", theme);
  }

  window.dispatchEvent(new Event(THEME_EVENT));
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const dark = theme === "dark";

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    applyTheme(saved === "light" ? "light" : "dark", false);
  }, []);

  const toggle = () => {
    applyTheme(dark ? "light" : "dark");
  };

  return (
    <button
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
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
      onMouseEnter={(event) => {
        event.currentTarget.style.opacity = "0.8";
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.opacity = "0.3";
      }}
      type="button"
    >
      {dark ? "\u2600\uFE0E" : "\u263E"}
    </button>
  );
}
