"use client";

import { AlertTriangle, PlayCircle, Spline, SplineIcon } from "lucide-react";

interface Props {
  flowsVisible: boolean;
  onToggleFlows: () => void;
  onStartTour: () => void;
  tourActive: boolean;
  chokepointMode: boolean;
  onToggleChokepoint: () => void;
  chokepointCount: number;
}

export function MapControls({
  flowsVisible,
  onToggleFlows,
  onStartTour,
  tourActive,
  chokepointMode,
  onToggleChokepoint,
  chokepointCount,
}: Props) {
  return (
    <div className="fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-white/10 bg-neutral-950/85 p-1 text-neutral-100 shadow-lg backdrop-blur">
      <button
        type="button"
        onClick={onToggleFlows}
        aria-pressed={flowsVisible}
        aria-label={flowsVisible ? "Hide flows" : "Show flows"}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
          flowsVisible
            ? "bg-white/10 text-white"
            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
        }`}
      >
        {flowsVisible ? (
          <Spline className="h-3.5 w-3.5" />
        ) : (
          <SplineIcon className="h-3.5 w-3.5 opacity-40" />
        )}
        <span className="hidden sm:inline">Flows</span>
      </button>

      <button
        type="button"
        onClick={onToggleChokepoint}
        aria-pressed={chokepointMode}
        aria-label={
          chokepointMode ? "Exit chokepoint view" : "Enter chokepoint view"
        }
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-wide transition-colors ${
          chokepointMode
            ? "bg-amber-500/15 text-amber-300"
            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Chokepoints</span>
        <span
          className={`ml-1 rounded-full px-1.5 py-[1px] text-[10px] tabular-nums ${
            chokepointMode
              ? "bg-amber-500/25 text-amber-100"
              : "bg-white/5 text-neutral-400"
          }`}
          aria-label={`${chokepointCount} critical chokepoints`}
        >
          {chokepointCount}
        </span>
      </button>

      <button
        type="button"
        onClick={onStartTour}
        disabled={tourActive}
        aria-label="Start guided tour"
        className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-wide text-neutral-400 transition-colors hover:bg-white/5 hover:text-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Start tour</span>
      </button>
    </div>
  );
}
