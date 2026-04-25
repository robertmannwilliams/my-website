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
            "radial-gradient(1200px 640px at 24% 32%, #f5efe1 0%, #ece1ca 62%, #e7dbc1 100%)",
          color: "#3a3026",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#b8762e",
              boxShadow: "0 0 0 8px rgba(184, 118, 46, 0.12)",
            }}
          />
          <div
            style={{
              fontSize: 18,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "rgba(84, 68, 52, 0.72)",
              fontFamily:
                "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
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
              color: "#33291f",
            }}
          >
            The physical supply chain of AI, on one map.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(68, 56, 42, 0.76)",
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
