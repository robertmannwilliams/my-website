"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import type { Node, Stage } from "@/features/aistack/types/stack";

interface Props {
  active: boolean;
  stop: Node | null;
  stage: Stage | null;
  index: number;
  total: number;
  paused: boolean;
  progress: number; // 0..1
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onExit: () => void;
}

export function TourNarration({
  active,
  stop,
  stage,
  index,
  total,
  paused,
  progress,
  onPlayPause,
  onNext,
  onPrev,
  onExit,
}: Props) {
  return (
    <AnimatePresence>
      {active && stop && stage && (
        <motion.div
          key="tour-narration"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="pointer-events-none fixed bottom-4 left-0 right-0 z-20 flex justify-center px-4"
        >
          <div className="pointer-events-auto w-full max-w-[560px] overflow-hidden rounded-[1.05rem] border border-border/80 bg-card/95 text-card-foreground shadow-[0_22px_60px_rgba(90,72,48,0.16)] backdrop-blur">
            <div className="h-0.5 w-full bg-border/60">
              <div
                className="h-full bg-primary/75 transition-[width] duration-100 ease-linear"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>

            <div className="px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className="font-ui inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]"
                  style={{
                    backgroundColor: `${stage.color}22`,
                    borderColor: `${stage.color}55`,
                    color: stage.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: stage.color }}
                  />
                  {stage.name}
                </span>
                <span className="font-ui text-xs text-muted-foreground">
                  {index + 1} / {total}
                </span>
              </div>

              <h2 className="font-display text-xl leading-tight text-foreground">
                {stop.name}
              </h2>
              <p className="font-display mt-1 text-sm italic text-foreground/72">
                {stop.tagline}
              </p>
              <p className="font-body mt-2 text-sm leading-6 text-foreground/82">
                {stop.summary}
              </p>

              <div className="mt-4 flex items-center gap-2">
                <ControlButton
                  onClick={onPrev}
                  disabled={index === 0}
                  ariaLabel="Previous stop"
                >
                  <ChevronLeft className="h-4 w-4" />
                </ControlButton>
                <ControlButton
                  onClick={onPlayPause}
                  ariaLabel={paused ? "Play" : "Pause"}
                >
                  {paused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </ControlButton>
                <ControlButton onClick={onNext} ariaLabel="Next stop">
                  <ChevronRight className="h-4 w-4" />
                </ControlButton>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={onExit}
                  className="font-ui flex items-center gap-1 rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Exit
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ControlButton({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-background/75 text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
