export type HomeVignetteKind = "writing" | "work" | "about" | "systems";

interface HomeIllustrationVignetteProps {
  kind: HomeVignetteKind;
  className?: string;
}

export default function HomeIllustrationVignette({
  kind,
  className,
}: HomeIllustrationVignetteProps) {
  if (kind === "writing") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M22 104C64 38 114 124 158 62C190 18 224 42 244 28" strokeWidth="6" opacity="0.54" />
          <path d="M28 122H232" strokeWidth="4" opacity="0.3" />
          <path d="M54 48H138M44 72H112M82 96H176" strokeWidth="3" opacity="0.32" />
        </g>
      </svg>
    );
  }

  if (kind === "work") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M24 118H238" strokeWidth="6" />
          <path d="M50 118V54H104V118" strokeWidth="5" />
          <path d="M132 118V34H180V118" strokeWidth="6" />
          <path d="M198 118V72H232V118" strokeWidth="5" />
          <path d="M62 76H94M142 58H170M142 82H170" strokeWidth="3" opacity="0.42" />
        </g>
      </svg>
    );
  }

  if (kind === "about") {
    return (
      <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
        <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
          <path d="M130 22L230 118H30L130 22Z" strokeWidth="6" />
          <path d="M130 22V118" strokeWidth="4" opacity="0.44" />
          <path d="M74 78H186M96 98H164" strokeWidth="3" opacity="0.35" />
        </g>
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 260 140">
      <g fill="none" stroke="currentColor" strokeLinecap="square" strokeLinejoin="miter">
        <path d="M30 104C70 40 112 112 150 62C188 12 224 54 236 30" strokeWidth="5" opacity="0.48" />
        <path d="M54 80L108 104L158 62L216 64" strokeWidth="4" opacity="0.34" />
      </g>
      <g fill="currentColor" opacity="0.34">
        <circle cx="54" cy="80" r="7" />
        <circle cx="108" cy="104" r="7" />
        <circle cx="158" cy="62" r="7" />
        <circle cx="216" cy="64" r="7" />
      </g>
    </svg>
  );
}
