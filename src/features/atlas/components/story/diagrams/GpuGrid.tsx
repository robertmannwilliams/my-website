// Fig. 2 — a GPU drawn as a city grid of identical blocks beside a CPU drawn
// as a few grand buildings. Ink draw-on, then washes, then annotations.

export default function GpuGrid({ drawn }: { drawn: boolean }) {
  // GPU die inner grid: a sweep of verticals then horizontals.
  const verticals = Array.from({ length: 11 }, (_, i) => 302 + i * 15);
  const horizontals = Array.from({ length: 11 }, (_, i) => 96 + i * 15);
  return (
    <svg
      viewBox="0 0 520 340"
      className={`diagram${drawn ? " is-drawn" : ""}`}
      role="img"
      aria-label="Diagram: a CPU drawn as a few grand buildings beside a GPU drawn as a vast city grid of identical blocks"
    >
      {/* washes */}
      <rect className="d-wash" x="34" y="116" width="158" height="138" fill="var(--wash-ochre)" style={{ "--d": "900ms" } as React.CSSProperties} />
      <rect className="d-wash" x="290" y="82" width="178" height="176" fill="var(--wash-teal)" style={{ "--d": "1050ms" } as React.CSSProperties} />

      {/* CPU: a few grand buildings */}
      <path className="d-line" pathLength={1} d="M38,252 L41,164 L80,162.5 L81,252" style={{ "--d": "0ms" } as React.CSSProperties} />
      <path className="d-line" pathLength={1} d="M89,252 L90,122 L110,108 L130,121 L131.5,252" style={{ "--d": "120ms" } as React.CSSProperties} />
      <path className="d-line" pathLength={1} d="M140,252 L141,186 L188,184.5 L188,252" style={{ "--d": "240ms" } as React.CSSProperties} />
      {/* windows */}
      <path className="d-line d-line--faint" pathLength={1} d="M50,180 h8 m8,0 h8 M50,200 h8 m8,0 h8 M50,220 h8 m8,0 h8" style={{ "--d": "420ms" } as React.CSSProperties} />
      <path className="d-line d-line--faint" pathLength={1} d="M98,140 h8 m8,0 h8 M98,162 h8 m8,0 h8 M98,184 h8 m8,0 h8 M98,206 h8 m8,0 h8" style={{ "--d": "500ms" } as React.CSSProperties} />
      <path className="d-line d-line--faint" pathLength={1} d="M150,200 h8 m10,0 h8 M150,222 h8 m10,0 h8" style={{ "--d": "580ms" } as React.CSSProperties} />
      {/* shared ground line, slightly wavy */}
      <path className="d-line" pathLength={1} d="M30,252.5 C90,251.5 180,253 232,252 M288,252 C360,253 440,251.5 492,252.5" style={{ "--d": "60ms" } as React.CSSProperties} />

      {/* GPU: one die, hundreds of identical blocks */}
      <path className="d-line" pathLength={1} d="M292,84 L468,82.5 L469,258 L290.5,257 Z" style={{ "--d": "300ms" } as React.CSSProperties} />
      {verticals.map((x, i) => (
        <line key={`v${x}`} className="d-line d-line--faint" pathLength={1} x1={x} y1={86} x2={x} y2={254} style={{ "--d": `${560 + i * 36}ms` } as React.CSSProperties} />
      ))}
      {horizontals.map((y, i) => (
        <line key={`h${y}`} className="d-line d-line--faint" pathLength={1} x1={294} y1={y} x2={466} y2={y} style={{ "--d": `${620 + i * 36}ms` } as React.CSSProperties} />
      ))}

      {/* labels */}
      <text className="d-mono-label d-note" x="38" y="282" style={{ "--d": "1200ms" } as React.CSSProperties}>CPU</text>
      <text className="d-note" x="38" y="302" style={{ "--d": "1280ms" } as React.CSSProperties}>a few brilliant workers</text>
      <text className="d-mono-label d-note" x="292" y="282" style={{ "--d": "1360ms" } as React.CSSProperties}>GPU</text>
      <text className="d-note" x="292" y="302" style={{ "--d": "1440ms" } as React.CSSProperties}>twenty thousand simple workers, at once</text>
    </svg>
  );
}
