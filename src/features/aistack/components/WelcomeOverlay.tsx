"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "atlas-welcome-dismissed-v1";

export function WelcomeOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage unavailable — be gracious, just show the overlay once
    }

    const frame = window.requestAnimationFrame(() => {
      setOpen(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
          className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(60,46,31,0.22)] p-4 backdrop-blur-sm"
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
            className="relative w-full max-w-md rounded-[1.1rem] border border-border/80 bg-card/95 p-7 text-card-foreground shadow-[0_24px_60px_rgba(90,72,48,0.16)]"
          >
            <p className="font-ui text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Welcome
            </p>
            <h2
              id="welcome-title"
              className="font-display mt-2 text-2xl leading-tight text-foreground"
            >
              The physical supply chain of AI, on one map.
            </h2>
            <p className="font-body mt-3 text-[1.02rem] leading-7 text-foreground/78">
              Click any pin for detail. Toggle stages on the left. Hover a
              pin to trace its flows. Switch to chokepoint view to see where
              the stack is most concentrated.
            </p>
            <p className="font-body mt-3 text-[1.02rem] leading-7 text-foreground/68">
              Prefer a curated walkthrough? Hit{" "}
              <span className="font-display italic text-foreground">Start tour</span>{" "}
              up top.
            </p>
            <div className="mt-6 flex items-center justify-between gap-3">
              <Link
                href="/aistack/about"
                onClick={dismiss}
                className="font-ui text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Methodology &amp; sources
              </Link>
              <button
                type="button"
                onClick={dismiss}
                className="font-ui rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
