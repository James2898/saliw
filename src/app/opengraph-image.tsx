import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        backgroundColor: "#FDF8F3",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 700,
          color: "#2D1F1B",
          letterSpacing: "-2px",
          lineHeight: 1,
        }}
      >
        Saliw
      </div>
      <div
        style={{
          width: 160,
          height: 4,
          backgroundColor: "#863bff",
          borderRadius: 2,
          marginTop: 32,
          marginBottom: 28,
        }}
      />
      <div
        style={{
          fontSize: 28,
          color: "#6B4F3A",
          letterSpacing: "0.04em",
        }}
      >
        Worship Music Portal
      </div>
    </div>,
    { ...size }
  );
}
