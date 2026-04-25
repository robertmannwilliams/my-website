"use client";

import { motion } from "framer-motion";

export function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center bg-background"
      aria-hidden
    >
      <div className="font-ui flex flex-col items-center gap-3 text-muted-foreground">
        <motion.div
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          className="h-2 w-2 rounded-full bg-primary/70"
        />
        <span className="text-xs uppercase tracking-[0.25em]">
          Loading atlas
        </span>
      </div>
    </motion.div>
  );
}
