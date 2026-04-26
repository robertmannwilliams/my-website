"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import { getStageColorVar } from "@/features/aistack/content/stages";
import type {
  MegaLayer,
  MegaLayerId,
  Stage,
  StageId,
} from "@/features/aistack/types/stack";

interface Props {
  stages: Stage[];
  megaLayers: MegaLayer[];
  enabled: Set<StageId>;
  countByStage: Record<StageId, number>;
  onToggle: (id: StageId) => void;
  onToggleMegaLayer: (ids: StageId[]) => void;
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
  megaLayers,
  enabled,
  countByStage,
  onToggle,
  onToggleMegaLayer,
  onSolo,
  onReset,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<MegaLayerId, boolean>>({
    inputs: false,
    toolchain: false,
    silicon: false,
    systems: false,
    deployment: false,
  });
  const stageById = new Map(stages.map((stage) => [stage.id, stage]));
  const sortedMegaLayers = [...megaLayers].sort((a, b) => a.order - b.order);

  return (
    <>
      <header className="flex items-baseline justify-between gap-2 border-b border-border/70 px-5 pb-3 pt-5">
        <h2 className="font-display text-lg text-foreground">Stack Layers</h2>
        <button
          type="button"
          onClick={onReset}
          className="font-ui text-xs uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Reset
        </button>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto py-3">
        {sortedMegaLayers.map((megaLayer) => {
          const sectionStages = megaLayer.stageIds
            .map((id) => stageById.get(id))
            .filter((stage): stage is Stage => Boolean(stage))
            .sort((a, b) => a.order - b.order);
          const stageIds = sectionStages.map((stage) => stage.id);
          const allOn = stageIds.every((id) => enabled.has(id));
          const someOn = stageIds.some((id) => enabled.has(id));
          const isCollapsed = collapsed[megaLayer.id];
          const count = sectionStages.reduce(
            (sum, stage) => sum + (countByStage[stage.id] ?? 0),
            0,
          );
          return (
            <section key={megaLayer.id} className="px-3">
              <div
                className="rounded-lg border border-border/60 bg-background/32"
              >
                <div className="flex items-center gap-1 px-3 py-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsed((current) => ({
                        ...current,
                        [megaLayer.id]: !current[megaLayer.id],
                      }))
                    }
                    aria-expanded={!isCollapsed}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      className={`h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform ${
                        isCollapsed ? "-rotate-90" : ""
                      }`}
                    />
                    <span className="font-display flex-1 truncate text-sm tracking-[0.04em] text-foreground">
                      {megaLayer.name}
                    </span>
                    <span className="font-ui text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                      {count}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-pressed={allOn}
                    aria-label={`Toggle ${megaLayer.name}`}
                    onClick={() => onToggleMegaLayer(stageIds)}
                    className={`h-4 w-4 rounded-full border transition-colors ${
                      allOn
                        ? "border-primary bg-primary"
                        : someOn
                          ? "border-primary/55 bg-primary/25"
                          : "border-foreground/20 bg-transparent"
                    }`}
                  />
                </div>
                {!isCollapsed && (
                  <ul className="pb-2">
                    {sectionStages.map((stage) => (
                      <StageRow
                        key={stage.id}
                        stage={stage}
                        count={countByStage[stage.id] ?? 0}
                        isOn={enabled.has(stage.id)}
                        isSolo={enabled.size === 1 && enabled.has(stage.id)}
                        onToggle={onToggle}
                        onSolo={onSolo}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function StageRow({
  stage,
  count,
  isOn,
  isSolo,
  onToggle,
  onSolo,
}: {
  stage: Stage;
  count: number;
  isOn: boolean;
  isSolo: boolean;
  onToggle: (id: StageId) => void;
  onSolo: (id: StageId) => void;
}) {
  return (
    <li>
      <div
        className={`group flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-muted/70 ${
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
}
