"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

const STORAGE_KEY = "atlas-welcome-dismissed-v1";

export function WelcomeOverlay() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !window.localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable — be gracious, just show the overlay once
      return true;
    }
  });

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="welcome-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismiss}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <motion.div
            key="welcome-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-xl border border-white/10 bg-neutral-950 p-7 text-neutral-100 shadow-2xl"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
              Welcome
            </p>
            <h2
              id="welcome-title"
              className="mt-2 font-serif text-2xl leading-tight text-white"
            >
              The physical supply chain of AI, on one map.
            </h2>
            <p className="mt-3 text-sm text-neutral-300">
              Click any pin for detail. Toggle stages on the left. Hover a
              pin to trace its flows. Switch to chokepoint view to see where
              the stack is most concentrated.
            </p>
            <p className="mt-3 text-sm text-neutral-400">
              Prefer a curated walkthrough? Hit{" "}
              <span className="font-medium text-neutral-200">Start tour</span>{" "}
              up top.
            </p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link
                href="/aistack/about"
                onClick={dismiss}
                className="text-xs uppercase tracking-wide text-neutral-400 transition-colors hover:text-neutral-100"
              >
                Methodology &amp; sources
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-neutral-950 transition-colors hover:bg-white"
              >
                Explore the map
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
