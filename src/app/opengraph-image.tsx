import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded OG image (docs/03-COPY.md): paper white, kola text, floor-plan
 * motif, wordmark + H1. Code-drawn — no photo dependency.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div
            style={{
              fontSize: 44,
              fontWeight: 700,
              color: "#291411",
              letterSpacing: "-0.01em",
            }}
          >
            ClockHost
          </div>
          <div
            style={{
              fontSize: 58,
              lineHeight: 1.05,
              color: "#291411",
              marginTop: 24,
            }}
          >
            Find a space that fits your plans.
          </div>
          <div style={{ fontSize: 26, color: "#80183d", marginTop: 20 }}>
            Reviewed venues and shortlets across Nigeria
          </div>
        </div>
        <svg width="320" height="440" viewBox="0 0 320 440" aria-hidden="true">
          <rect
            x="24"
            y="24"
            width="272"
            height="392"
            fill="none"
            stroke="#80183d"
            strokeWidth="3"
          />
          <line x1="24" y1="180" x2="296" y2="180" stroke="#80183d" strokeWidth="1.5" opacity="0.5" />
          <line x1="160" y1="24" x2="160" y2="416" stroke="#80183d" strokeWidth="1.5" opacity="0.5" />
          {[
            [70, 90],
            [120, 90],
            [210, 90],
            [110, 250],
            [160, 250],
            [210, 250],
            [110, 330],
            [210, 330],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="13"
              fill={i < 3 ? "#F1AF57" : "none"}
              stroke={i < 3 ? "#F1AF57" : "#291411"}
              strokeWidth="2.5"
            />
          ))}
        </svg>
      </div>
    ),
    { ...size },
  );
}
