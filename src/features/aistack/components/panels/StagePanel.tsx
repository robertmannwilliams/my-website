"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { getStageColorVar } from "@/features/aistack/content/stages";
import type { Stage, StageId } from "@/features/aistack/types/stack";

interface Props {
  stages: Stage[];
  enabled: Set<StageId>;
  countByStage: Record<StageId, number>;
  onToggle: (id: StageId) => void;
  onSolo: (id: StageId) => void;
  onReset: () => void;
}

export function StagePanel(props: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed left-0 top-0 z-10 hidden h-full w-[280px] flex-col border-r border-border/80 bg-card/88 text-card-foreground shadow-[12px_0_28px_rgba(90,72,48,0.08)] backdrop-blur md:flex">
        <StagePanelContents {...props} />
      </aside>

      {/* Mobile hamburger */}
      <button
        type="button"
        aria-label="Open stage filters"
        onClick={() => setMobileOpen(true)}
        className="fixed left-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full border border-border/80 bg-card/92 text-foreground shadow-[0_14px_34px_rgba(90,72,48,0.14)] backdrop-blur md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={closeMobile}
              className="fixed inset-0 z-20 bg-[rgba(60,46,31,0.2)] md:hidden"
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed left-0 top-0 z-30 flex h-full w-[280px] max-w-[85%] flex-col border-r border-border/80 bg-card/95 text-card-foreground shadow-[12px_0_28px_rgba(90,72,48,0.08)] backdrop-blur md:hidden"
            >
              <button
                type="button"
                aria-label="Close stage filters"
                onClick={closeMobile}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/80"
              >
                <X className="h-4 w-4" />
              </button>
              <StagePanelContents {...props} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function StagePanelContents({
  stages,
  enabled,
  countByStage,
  onToggle,
  onSolo,
  onReset,
}: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <>
      <header className="flex items-baseline justify-between gap-2 border-b border-border/70 px-5 pb-3 pt-5">
        <h2 className="font-display text-lg text-foreground">Stages</h2>
        <button
          type="button"
          onClick={onReset}
          className="font-ui text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Reset
        </button>
      </header>

      <ul className="flex-1 overflow-y-auto py-2">
        {sorted.map((stage) => {
          const count = countByStage[stage.id] ?? 0;
          const isOn = enabled.has(stage.id);
          const isSolo = enabled.size === 1 && isOn;
          return (
            <li key={stage.id}>
              <div
                className={`group flex items-center gap-2 px-5 py-2 text-sm transition-colors hover:bg-muted/70 ${
                  isOn ? "text-foreground" : "text-foreground/52"
                }`}
              >
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isOn}
                    onChange={() => onToggle(stage.id)}
                    className="peer sr-only"
                    aria-label={`Toggle ${stage.name}`}
                  />
                  <span
                    className="inline-block h-3 w-3 flex-shrink-0 rounded-full border border-foreground/20 transition-opacity peer-checked:opacity-100"
                    style={{
                      background: getStageColorVar(stage.id),
                      opacity: isOn ? 1 : 0.35,
                    }}
                  />
                  <span className="font-body flex-1 truncate">{stage.name}</span>
                  <span className="font-ui text-xs text-muted-foreground">
                    {count}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onSolo(stage.id)}
                  aria-pressed={isSolo}
                  className={`font-ui rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    isSolo
                      ? "border-primary/30 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  Solo
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
