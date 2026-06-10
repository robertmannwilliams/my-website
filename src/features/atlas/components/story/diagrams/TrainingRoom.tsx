// Fig. 10 — abstract: a building-sized machine reading a library; pages
// streaming into a grid of numbers.

const BOOKS = [
  "M52,128 v-34", "M60,128 v-30", "M68,128 v-36", "M78,128 v-28", "M86,128 v-33",
  "M52,188 v-32", "M61,188 v-36", "M70,188 v-29", "M80,188 v-34",
  "M52,248 v-30", "M62,248 v-35", "M71,248 v-31", "M81,248 v-28", "M90,248 v-33",
];

const PAGES = [
  { d: "M168,160 l16,-5 l3,11 l-16,5 Z", delay: 760 },
  { d: "M206,144 l16,-4 l3,10 l-16,4 Z", delay: 840 },
  { d: "M246,136 l16,-3 l2,10 l-16,3 Z", delay: 920 },
  { d: "M286,136 l16,-1 l1,10 l-16,1 Z", delay: 1000 },
  { d: "M322,142 l15,2 l-1,10 l-15,-2 Z", delay: 1080 },
];

const WEIGHTS = [
  "0.41", "-1.73", "2.08", "-0.06",
  "1.19", "0.57", "-2.41", "0.93",
  "-0.34", "1.66", "0.02", "-1.08",
];

export default function TrainingRoom({ drawn }: { drawn: boolean }) {
  return (
    <svg
      viewBox="0 0 520 340"
      className={`diagram${drawn ? " is-drawn" : ""}`}
      role="img"
      aria-label="Diagram: a library's pages streaming into a building-sized machine that holds a grid of numbers"
    >
      <rect className="d-wash" x="44" y="66" width="62" height="190" fill="var(--wash-ochre)" style={{ "--d": "950ms" } as React.CSSProperties} />
      <rect className="d-wash" x="362" y="72" width="116" height="186" fill="var(--wash-teal)" style={{ "--d": "1100ms" } as React.CSSProperties} />

      {/* bookcase */}
      <path className="d-line" pathLength={1} d="M44,258 L45,64 L104,65 L105,258 Z" style={{ "--d": "0ms" } as React.CSSProperties} />
      <path className="d-line d-line--faint" pathLength={1} d="M46,128 h57 M46,188 h57" style={{ "--d": "160ms" } as React.CSSProperties} />
      {BOOKS.map((d, i) => (
        <path key={d} className="d-line d-line--faint" pathLength={1} d={d} style={{ "--d": `${260 + i * 30}ms` } as React.CSSProperties} />
      ))}

      {/* the reading stream */}
      <path className="d-line d-line--faint" pathLength={1} d="M112,168 C190,128 290,122 356,150" strokeDasharray="3 5" style={{ "--d": "620ms" } as React.CSSProperties} />
      {PAGES.map(({ d, delay }) => (
        <path key={d} className="d-line" pathLength={1} d={d} style={{ "--d": `${delay}ms` } as React.CSSProperties} />
      ))}

      {/* the machine: double-ruled, holding a grid of numbers */}
      <path className="d-line" pathLength={1} d="M360,260 L361,70 L480,71 L479,260 Z" style={{ "--d": "300ms" } as React.CSSProperties} />
      <path className="d-line d-line--faint" pathLength={1} d="M368,252 L368.5,78 L472,79 L471.5,252 Z" style={{ "--d": "440ms" } as React.CSSProperties} />
      {WEIGHTS.map((w, i) => (
        <text
          key={`${w}-${i}`}
          className="d-mono-label d-note"
          x={382 + (i % 3) * 32}
          y={104 + Math.floor(i / 3) * 40}
          style={{ "--d": `${1150 + i * 55}ms` } as React.CSSProperties}
        >
          {w}
        </text>
      ))}

      <text className="d-mono-label d-note" x="44" y="282" style={{ "--d": "1300ms" } as React.CSSProperties}>Corpus</text>
      <text className="d-note" x="44" y="302" style={{ "--d": "1380ms" } as React.CSSProperties}>a library, read once</text>
      <text className="d-mono-label d-note" x="360" y="282" style={{ "--d": "1460ms" } as React.CSSProperties}>Weights</text>
      <text className="d-note" x="360" y="302" style={{ "--d": "1540ms" } as React.CSSProperties}>the book it writes back</text>
    </svg>
  );
}
