import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** Gedeelde OG-afbeelding in de huisstijl: amber op zee-zwart, dieptelijnen. */
export function ogImage({ kicker, title, lines }: { kicker: string; title: string; lines: string[] }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#06090d",
          borderTop: "6px solid #ffb547",
          color: "#e7edf3",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: "#ffb547" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ffb547" }} />
          Whale Alert · {kicker}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{title}</div>
          {lines.map((l) => (
            <div key={l} style={{ fontSize: 34, color: "#93a6b8" }}>
              {l}
            </div>
          ))}
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
