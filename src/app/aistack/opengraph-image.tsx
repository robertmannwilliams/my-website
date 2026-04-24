import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Physical AI Stack Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "80px",
          background:
            "radial-gradient(1200px 600px at 30% 40%, #1a1a1a 0%, #0a0a0a 60%)",
          color: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#d99b5a",
              boxShadow: "0 0 0 8px rgba(217, 155, 90, 0.12)",
            }}
          />
          <div
            style={{
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Physical AI Stack Atlas
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              fontSize: 72,
              fontWeight: 500,
              lineHeight: 1.05,
              maxWidth: 960,
              color: "#fafafa",
            }}
          >
            The physical supply chain of AI, on one map.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.55)",
              maxWidth: 960,
              lineHeight: 1.3,
            }}
          >
            From quartz sand in Spruce Pine to GPUs in Ashburn — traced,
            connected, and scored by chokepoint risk.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
