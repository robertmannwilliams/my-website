"use client";

import { AlertTriangle, Network, Spline, SplineIcon } from "lucide-react";

interface Props {
  flowsVisible: boolean;
  onToggleFlows: () => void;
  showAllFlows: boolean;
  onToggleAllFlows: () => void;
  chokepointMode: boolean;
  onToggleChokepoint: () => void;
  chokepointCount: number;
}

export function MapControls({
  flowsVisible,
  onToggleFlows,
  showAllFlows,
  onToggleAllFlows,
  chokepointMode,
  onToggleChokepoint,
  chokepointCount,
}: Props) {
  return (
    <div className="fixed right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-border/80 bg-card/90 p-1 text-foreground shadow-[0_14px_34px_rgba(90,72,48,0.14)] backdrop-blur">
      <button
        type="button"
        onClick={onToggleFlows}
        aria-pressed={flowsVisible}
        aria-label={flowsVisible ? "Hide flows" : "Show flows"}
        className={`font-ui flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition-colors ${
          flowsVisible
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
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
        onClick={onToggleAllFlows}
        aria-pressed={showAllFlows}
        aria-label={
          showAllFlows
            ? "Show critical relationships only"
            : "Show all supply relationships"
        }
        className={`font-ui flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition-colors ${
          showAllFlows
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        }`}
      >
        <Network className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {showAllFlows ? "All links" : "Critical"}
        </span>
      </button>

      <button
        type="button"
        onClick={onToggleChokepoint}
        aria-pressed={chokepointMode}
        aria-label={
          chokepointMode ? "Exit chokepoint view" : "Enter chokepoint view"
        }
        className={`font-ui flex items-center gap-1.5 rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em] transition-colors ${
          chokepointMode
            ? "bg-accent/14 text-accent"
            : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
        }`}
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Chokepoints</span>
        <span
          className={`ml-1 rounded-full px-1.5 py-[1px] text-[10px] tabular-nums ${
            chokepointMode
              ? "bg-accent/18 text-accent"
              : "bg-muted text-muted-foreground"
          }`}
          aria-label={`${chokepointCount} critical chokepoints`}
        >
          {chokepointCount}
        </span>
      </button>
    </div>
  );
}
