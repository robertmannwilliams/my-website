"use client";

import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading the Physical AI Stack Atlas"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(78, 64, 44, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(78, 64, 44, 0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute h-[36rem] w-[36rem] rounded-full border border-foreground/10"
      />
      <div className="font-ui relative flex flex-col items-center gap-4 text-muted-foreground">
        <div className="relative grid h-20 w-20 place-items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border border-dashed border-foreground/20"
          />
          <motion.div
            animate={{ scale: [0.86, 1, 0.86], opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="h-9 w-9 rounded-full border border-primary/35 bg-card/70 shadow-[0_10px_28px_rgba(90,72,48,0.14)]"
          />
          <span className="absolute h-2.5 w-2.5 rounded-full bg-accent" />
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-xs uppercase tracking-[0.25em]">
            Loading atlas
          </span>
          <span className="font-body text-sm normal-case tracking-normal text-foreground/62">
            Charting 341 sites across 14 stack layers
          </span>
        </div>
        <motion.div
          animate={{ opacity: [0.25, 0.8, 0.25], scaleX: [0.65, 1, 0.65] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="h-px w-48 origin-center bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
      </div>
    </motion.div>
  );
}
