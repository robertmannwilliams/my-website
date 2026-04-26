"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
  getStageColorVar,
  getStageTint,
} from "@/features/aistack/content/stages";
import type {
  ChokepointSeverity,
  Node,
  Stage,
} from "@/features/aistack/types/stack";

interface Props {
  node: Node | null;
  stage: Stage | null;
  chokepointMode: boolean;
  isMobile: boolean;
  onClose: () => void;
}

const RISK_COLORS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: "#6b8e7a",
  2: "#9a9a5b",
  3: "#c9a85a",
  4: "#c98a5a",
  5: "#c36e5a",
};

export function NodeDetail({
  node,
  stage,
  isMobile,
  onClose,
}: Props) {
  if (!node || !stage) return null;

  const criticalSeverity = isCriticalSeverity(node.chokepointSeverity)
    ? node.chokepointSeverity
    : null;

  const positionClasses = isMobile
    ? "bottom-0 left-0 right-0 h-auto max-h-[85vh] rounded-t-xl border-t"
    : "right-0 top-0 h-full w-full max-w-[400px] border-l";

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={`fixed z-30 flex flex-col overflow-y-auto border-border/80 bg-card/95 text-card-foreground shadow-[0_22px_60px_rgba(90,72,48,0.16)] backdrop-blur ${positionClasses}`}
      aria-label={`${node.name} detail`}
    >
      <CloseButton onClose={onClose} />
      <Hero node={node} stage={stage} />
      <div className="space-y-5 px-6 pb-10 pt-5">
        {criticalSeverity && (
          <ChokepointAlert
            severity={criticalSeverity}
            narrative={node.chokepointNarrative}
          />
        )}
        <StageBadge stage={stage} />
        <h1 className="font-display text-[2rem] leading-tight text-foreground">
          {node.name}
        </h1>
        <p className="font-display text-[1.1rem] italic text-foreground/72">{node.tagline}</p>
        <SiteMeta node={node} />
        {node.keyFacts.length > 0 && <KeyFacts facts={node.keyFacts} />}
        <RiskMeter risk={node.chokepointRisk} />
        {node.sources.length > 0 && <Sources sources={node.sources} />}
      </div>
    </aside>
  );
}

function isCriticalSeverity(
  severity: ChokepointSeverity,
): severity is Extract<ChokepointSeverity, "monopoly" | "duopoly"> {
  return severity === "monopoly" || severity === "duopoly";
}

function ChokepointAlert({
  severity,
  narrative,
}: {
  severity: Extract<ChokepointSeverity, "monopoly" | "duopoly">;
  narrative?: string;
}) {
  const isMax = severity === "monopoly";
  const palette = isMax
    ? {
        ring: "border-accent/25 bg-accent/10",
        title: "text-accent",
        body: "text-foreground/76",
        label: "Critical chokepoint",
      }
    : {
        ring: "border-amber-700/20 bg-amber-500/10",
        title: "text-amber-800",
        body: "text-foreground/72",
        label: "Chokepoint",
      };
  return (
    <div
      role="alert"
      className={`border-t-2 px-3 py-3 ${palette.ring}`}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={`mt-0.5 h-4 w-4 flex-shrink-0 ${palette.title}`} />
        <div className="space-y-1">
          <p
            className={`font-ui text-[10px] font-semibold uppercase tracking-wide ${palette.title}`}
          >
            {palette.label} — {severity}
          </p>
          <p className={`font-body text-sm leading-snug ${palette.body}`}>
            {narrative ??
              `Public signals place this site in a ${severity} segment of the AI supply chain.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function SiteMeta({ node }: { node: Node }) {
  const location = [node.city, node.country].filter(Boolean).join(", ");
  return (
    <div className="font-body space-y-1 text-[1.02rem] leading-7 text-foreground/76">
      <p>
        Operated by <span className="text-foreground">{node.operator}</span>
        {node.parentCompany ? (
          <>
            {" "}
            under <span className="text-foreground">{node.parentCompany}</span>
          </>
        ) : null}
      </p>
      {location && <p>{location}</p>}
      {node.subType && <p className="text-foreground/62">{node.subType}</p>}
    </div>
  );
}

function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className="font-ui inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-[0.16em]"
      style={{
        backgroundColor: getStageTint(stage.id, 18),
        borderColor: getStageTint(stage.id, 42),
        color: getStageColorVar(stage.id),
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: getStageColorVar(stage.id) }}
      />
      {stage.name}
    </span>
  );
}

function KeyFacts({ facts }: { facts: { label: string; value: string }[] }) {
  return (
    <dl className="divide-y divide-border/60 rounded border border-border/70 bg-background/50">
      {facts.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline justify-between gap-4 px-3 py-2 text-sm"
        >
          <dt className="font-ui text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {f.label}
          </dt>
          <dd className="font-body text-right text-[0.98rem] text-foreground">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RiskMeter({ risk }: { risk: 1 | 2 | 3 | 4 | 5 }) {
  const color = RISK_COLORS[risk];
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p
          className="font-ui text-xs uppercase tracking-[0.16em] text-muted-foreground"
        >
          Chokepoint risk
        </p>
        <div className="flex gap-1" aria-label={`Risk ${risk} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className="h-2 w-5 rounded-sm"
              style={{
                background:
                  i <= risk ? color : "color-mix(in srgb, var(--foreground) 10%, transparent)",
              }}
            />
          ))}
        </div>
        <span className="font-body text-xs text-muted-foreground">{risk}/5</span>
      </div>
    </div>
  );
}

function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="font-ui absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-muted text-lg leading-none text-foreground transition-colors hover:bg-muted/80"
    >
      ×
    </button>
  );
}

function Hero({ node, stage }: { node: Node; stage: Stage }) {
  const [broken, setBroken] = useState(false);
  const showImage = !!node.heroImage && !broken;

  return (
    <div
      className="relative h-44 w-full overflow-hidden"
      style={{ background: getStageColorVar(stage.id) }}
    >
      {showImage && node.heroImage && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={node.heroImage}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
      {showImage && (
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,10,10,0) 40%, rgba(10,10,10,0.75) 100%)",
          }}
        />
      )}
    </div>
  );
}

function Sources({ sources }: { sources: { label: string; url: string }[] }) {
  return (
    <div className="space-y-2">
      <h2 className="font-ui text-xs uppercase tracking-[0.16em] text-muted-foreground">
        Sources
      </h2>
      <ul className="font-body space-y-1 text-sm">
        {sources.map((s) => (
          <li key={s.url}>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/82 underline decoration-foreground/20 underline-offset-2 transition-colors hover:decoration-foreground/60"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
