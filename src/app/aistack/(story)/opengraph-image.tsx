// OG card: the engineering-drawing title block, set in Plex Mono on paper.
// Generated at build (static route); fonts fetched from google/fonts.

import { ImageResponse } from "next/og";

export const alt =
  "The Physical AI Stack — an illustrated atlas of the mines, machines, and buildings behind AI";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#F8F4E9";
const SHADE = "#EFE9D8";
const INK = "#2B4A8C";
const INK_STRONG = "#1C3263";
const RED = "#C8502E";

const FONT_BASE =
  "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono";

async function font(file: string) {
  const res = await fetch(`${FONT_BASE}/${file}`);
  return res.arrayBuffer();
}

export default async function Image() {
  const [regular, medium] = await Promise.all([
    font("IBMPlexMono-Regular.ttf"),
    font("IBMPlexMono-Medium.ttf"),
  ]);

  const field = (label: string, value: string, grow = false) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "14px 22px",
        borderRight: `1px solid ${INK}`,
        flexGrow: grow ? 1 : 0,
      }}
    >
      <span style={{ fontSize: 15, color: INK, letterSpacing: 3 }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 21,
          color: INK_STRONG,
          letterSpacing: 2,
          fontFamily: "PlexMedium",
          marginTop: 6,
        }}
      >
        {value}
      </span>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: PAPER,
          padding: 36,
          fontFamily: "PlexRegular",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            border: `2px solid ${INK}`,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              borderBottom: `1px solid ${INK}`,
              background: SHADE,
            }}
          >
            {field("PROJECT", "THE PHYSICAL AI STACK", true)}
            {field("SHEET", "01")}
            {field("DATE", "JUN 2026")}
            {field("SCALE", "1 : 40,000,000")}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              padding: "56px 64px",
              position: "relative",
            }}
          >
            <div
              style={{
                fontSize: 84,
                color: INK_STRONG,
                letterSpacing: 1,
                fontFamily: "PlexMedium",
                lineHeight: 1.05,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span>THE PHYSICAL</span>
              <span>AI STACK</span>
            </div>
            <div
              style={{
                marginTop: 30,
                fontSize: 26,
                color: INK,
                lineHeight: 1.45,
                maxWidth: 760,
                display: "flex",
              }}
            >
              From a quartz ridge in North Carolina to the answer on your
              screen — the mines, machines, and buildings behind AI.
            </div>

            <svg
              width="1060"
              height="170"
              viewBox="0 0 1060 170"
              style={{ position: "absolute", bottom: 6, left: 40 }}
            >
              <path
                d="M20,150 C220,120 320,140 480,90 C640,40 760,90 900,50 C960,33 1010,30 1040,24"
                fill="none"
                stroke={INK}
                strokeWidth="2.5"
                strokeDasharray="7 9"
              />
              <circle cx="20" cy="150" r="7" fill="none" stroke={INK} strokeWidth="3" />
              <circle cx="480" cy="90" r="7" fill="none" stroke={INK} strokeWidth="3" />
              <circle cx="900" cy="50" r="7" fill="none" stroke={INK} strokeWidth="3" />
              <circle cx="1040" cy="24" r="7" fill={INK} />
            </svg>

            <div
              style={{
                position: "absolute",
                right: 56,
                top: 64,
                transform: "rotate(-3deg)",
                border: `4px solid ${RED}`,
                color: RED,
                padding: "14px 24px",
                fontSize: 30,
                letterSpacing: 4,
                fontFamily: "PlexMedium",
                display: "flex",
                opacity: 0.92,
              }}
            >
              341 SITES
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "PlexRegular", data: regular, weight: 400 },
        { name: "PlexMedium", data: medium, weight: 500 },
      ],
    },
  );
}
