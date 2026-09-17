import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#140f0d",
          backgroundImage:
            "radial-gradient(ellipse 60% 60% at 50% 30%, rgba(200,30,30,0.35), transparent 70%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 14, height: 64, backgroundColor: "#c81e1e" }} />
          <span
            style={{
              fontSize: 96,
              fontWeight: 700,
              letterSpacing: 6,
              color: "white",
              textTransform: "uppercase",
            }}
          >
            TattFlow
          </span>
        </div>
        <span
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          Fini les DM Instagram
        </span>
      </div>
    ),
    { ...size }
  );
}
