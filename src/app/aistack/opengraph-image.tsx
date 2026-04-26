import { ImageResponse } from "next/og";
import stack from "@/features/aistack/data/stack.json";

export const runtime = "edge";
export const alt = "Physical AI Stack Atlas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const siteCount = stack.nodes.length.toLocaleString("en-US");
const stageCount = stack.stages.length.toLocaleString("en-US");
const relationshipCount = stack.allFlows.length.toLocaleString("en-US");
const subtitle = `${siteCount} real sites, ${stageCount} stack layers, and ${relationshipCount} supply relationships traced from raw materials to deployed inference.`;

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
            "radial-gradient(780px 420px at 18% 28%, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0) 62%), radial-gradient(900px 520px at 82% 12%, rgba(95,127,143,0.16) 0%, rgba(95,127,143,0) 56%), linear-gradient(135deg, #f3ead8 0%, #eadfc8 54%, #e5d6bb 100%)",
          color: "#3a3026",
          fontFamily: "Georgia, 'Times New Roman', serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.22,
            backgroundImage:
              "linear-gradient(rgba(58,48,38,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(58,48,38,0.12) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 92,
            top: 84,
            width: 280,
            height: 280,
            border: "1px solid rgba(58,48,38,0.16)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 152,
            top: 144,
            width: 160,
            height: 160,
            border: "1px solid rgba(58,48,38,0.14)",
            borderRadius: 999,
          }}
        />
        <div
          style={{
            position: "absolute",
            right: 68,
            top: 224,
            width: 380,
            height: 1,
            background: "rgba(111,98,74,0.32)",
            transform: "rotate(-18deg)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 9999,
              background: "#3f5f50",
              boxShadow: "0 0 0 8px rgba(63, 95, 80, 0.12)",
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
              fontSize: 74,
              fontWeight: 500,
              lineHeight: 1.05,
              maxWidth: 900,
              color: "#33291f",
            }}
          >
            Where AI actually lives.
          </div>
          <div
            style={{
              fontSize: 28,
              color: "rgba(68, 56, 42, 0.76)",
              maxWidth: 900,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 12 }}>
            {["#8f6f3f", "#4f7b68", "#9b5f4f", "#5f7f8f"].map((color) => (
              <div
                key={color}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(58,48,38,0.32)",
                  background: "#f8f3e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 18px rgba(80,62,38,0.14)",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 999,
                    background: color,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
