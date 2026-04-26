"use client";

import type { CSSProperties } from "react";
import type { StageId } from "@/features/aistack/types/stack";

interface StagePinProps {
  stageId: StageId;
  label: string;
  href: string;
  nodeId?: string;
  active?: boolean;
  dimmed?: boolean;
  size?: number;
}

type StagePinCss = CSSProperties & {
  "--stage-pin-color": string;
  "--stage-pin-size": string;
};

export function StagePin({
  stageId,
  label,
  href,
  nodeId,
  active = false,
  dimmed = false,
  size = 32,
}: StagePinProps) {
  return (
    <a
      href={href}
      aria-label={label}
      data-node-id={nodeId}
      data-active={active || undefined}
      data-dimmed={dimmed || undefined}
      className="stage-pin"
      style={stagePinStyle(stageId, size)}
    >
      <span
        className="stage-pin__glyph"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: stagePinGlyphSvg(stageId) }}
      />
    </a>
  );
}

export function createStagePinLink({
  stageId,
  label,
  href,
  nodeId,
  size = 32,
}: StagePinProps): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = href;
  link.className = "stage-pin";
  link.setAttribute("aria-label", label);
  link.dataset.nodeId = nodeId;
  link.style.setProperty("--stage-pin-color", `var(--stage-${stageId})`);
  link.style.setProperty("--stage-pin-size", `${size}px`);

  const glyph = document.createElement("span");
  glyph.className = "stage-pin__glyph";
  glyph.setAttribute("aria-hidden", "true");
  glyph.innerHTML = stagePinGlyphSvg(stageId);
  link.appendChild(glyph);

  return link;
}

export function setStagePinSize(pin: HTMLElement, size: number) {
  pin.style.setProperty("--stage-pin-size", `${size}px`);
}

function stagePinStyle(stageId: StageId, size: number): StagePinCss {
  return {
    "--stage-pin-color": `var(--stage-${stageId})`,
    "--stage-pin-size": `${size}px`,
  };
}

function stagePinGlyphSvg(stageId: StageId): string {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round">${stageGlyphPaths[stageId]}</svg>`;
}

const stageGlyphPaths: Record<StageId, string> = {
  "raw-materials": `
    <path d="M7.5 34.5 18.8 13.2 25.2 24.4 30.8 17.3 41.2 34.2" />
    <path d="M14.7 25.1 20.4 27.6 24.8 24.7" />
    <path d="M11.6 38.4c7.1 1.4 15.1 1.2 25.4-.4" />
  `,
  chemicals: `
    <path d="M20 8.8h8" />
    <path d="M22.3 9.4v10.1L13.1 35c-1.7 3 1.1 5.5 4.6 5.5h12.7c3.8 0 6.2-2.6 4.5-5.6l-9.2-15.4V9.4" />
    <path d="M17.2 32.4c4.9-2.5 9.5 2.5 14.1-.2" />
    <path d="M34.7 12.4h.1M37.8 18.8h.1M31.8 5.7h.1" />
  `,
  wafers: `
    <ellipse cx="24" cy="14" rx="13.7" ry="5.2" />
    <path d="M10.3 14.6v7.1c0 2.8 6.2 5.1 13.7 5.1s13.7-2.3 13.7-5.1v-7" />
    <path d="M10.3 22.2v7.1c0 2.8 6.2 5.1 13.7 5.1s13.7-2.3 13.7-5.1v-7" />
    <path d="M17.9 13.3c4.5 1.5 8.1 1.6 12.3.1" />
  `,
  equipment: `
    <path d="M24 7.5v6.1M24 34.4v6.1M7.6 24h6.2M34.2 24h6.2" />
    <path d="m12.4 12.4 4.3 4.3M31.3 31.3l4.3 4.3M35.6 12.3l-4.3 4.3M16.7 31.3l-4.3 4.3" />
    <circle cx="24" cy="24" r="10.2" />
    <circle cx="24" cy="24" r="3.8" />
  `,
  eda: `
    <path d="M9.5 14.5h8.6v8.3H9.5zM30 8.9h8.5v8.4H30zM30.2 30.4h8.4v8.3h-8.4z" />
    <path d="M18.2 18.6h5.4c3.8 0 4.8-5.4 6.4-5.4" />
    <path d="M18.1 20.8h6.3c4.4 0 3.5 13.8 5.8 13.8" />
    <path d="M13.8 22.8v8.8h10.1" />
  `,
  design: `
    <path d="M12.1 12.2h18.7l5.1 5.2v18.4H12.1z" />
    <path d="M30.5 12.4v5.4h5.2" />
    <path d="M16.9 29.8c4.2-8.4 11.2-8.7 14.3-4.4" />
    <path d="M20 34.1c3.3-4.5 6.4-4.9 10.5-2.2" />
    <path d="m32.1 22.9 5.4-5.4" />
  `,
  fabrication: `
    <path d="M8.7 35.5h30.5" />
    <path d="M11.5 35.4V21.2l7.6 4.2v-4.1l7.8 4.2v-4.2l9.2 5v9" />
    <path d="M16.1 30.2h3M23.2 30.2h3M30.4 30.2h3" />
    <path d="M15.8 16.4c3-2.7 6.9-3.7 12.1-3.1" />
    <path d="M30.1 10.2 36 8.5l-2.1 5.8" />
  `,
  memory: `
    <path d="M14 10.6h20v26.8H14z" />
    <path d="M18.2 15.4h11.7M18.2 21.3h11.7M18.2 27.1h11.7M18.2 32.9h11.7" />
    <path d="M9.4 15.4h4.4M9.4 23.9h4.4M9.4 32.5h4.4M34.2 15.4h4.4M34.2 23.9h4.4M34.2 32.5h4.4" />
  `,
  packaging: `
    <path d="M10 13h28v22H10z" />
    <path d="M16.1 18.2h7v5.7h-7zM25.4 18.2h6.5v5.7h-6.5zM16.1 26.4h6.4v5.2h-6.4zM24.9 26.4h7v5.2h-7z" />
    <path d="M7 18.5h3M7 29.6h3M38 18.5h3M38 29.6h3" />
  `,
  networking: `
    <circle cx="12.5" cy="24" r="4.6" />
    <circle cx="35.5" cy="13.6" r="4.6" />
    <circle cx="35.1" cy="34.5" r="4.6" />
    <path d="M16.8 22.1 31.2 15.4M16.8 26.1l14.2 6.5" />
    <path d="M20.2 24.1h7.3" />
  `,
  assembly: `
    <path d="M13.2 11.4h21.6v25.2H13.2z" />
    <path d="M17.4 16.2h13.1M17.4 22.1h13.1M17.4 28h13.1" />
    <path d="M20.3 35.9v4.3M27.7 35.9v4.3" />
    <path d="M9.8 17.5h3.4M34.8 17.5h3.4M9.8 29.6h3.4M34.8 29.6h3.4" />
  `,
  datacenter: `
    <path d="M8.8 35.8h30.4" />
    <path d="M11.2 35.7V17.4h8.4v18.3M20.7 35.7V11.8h8.4v23.9M30.4 35.7V20.3h6.3v15.4" />
    <path d="M14.6 22.4h1.5M24 17.1h1.5M33.2 25.4h1.2M14.5 29.8h1.5M24 26.9h1.5" />
  `,
  power: `
    <path d="M27 6.9 13.8 25.2h9.4l-2.2 15.9 13.4-19.7h-9.6z" />
    <path d="M9.4 39.1c8.9 2.5 19 2 29.4-.5" />
  `,
  connectivity: `
    <path d="M7.8 29.1c5.8-5.4 11.4-5.3 16.7 0s10.5 5.3 15.7-.1" />
    <path d="M7.8 36.4c5.8-5.4 11.4-5.3 16.7 0s10.5 5.3 15.7-.1" />
    <path d="M13.2 18.8c6.5-5.8 14.2-5.8 21.8.1" />
    <path d="M18.7 13.4c3.6-2.7 7.2-2.7 10.8.1" />
  `,
};
