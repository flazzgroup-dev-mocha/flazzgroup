import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { getSettings } from "@/lib/queries";

export const alt = "FLAZZ GROUP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Satori needs woff/ttf (not woff2), and reads them from disk — never the network. */
const fontFile = (name: string) =>
  readFile(join(process.cwd(), "src", "fonts", name));

export default async function OpengraphImage() {
  const [settings, regular, black] = await Promise.all([
    getSettings(),
    fontFile("Poppins-400.woff"),
    fontFile("Poppins-800.woff"),
  ]);

  /**
   * Banners carry no copy any more — the words are baked into the artwork,
   * which satori cannot read. The share card is therefore built from the
   * settings row, which is where the site's own headline already lives.
   */
  const headline = settings.seoTitle || settings.siteName;
  const highlight = "";
  const chips: string[] = [];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #071321 0%, #0D1B3D 48%, #123C7B 100%)",
          color: "#EEF4FF",
          position: "relative",
          fontFamily: "Poppins",
        }}
      >
        {/* Volt glow */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: 999,
            background: "rgba(46,124,246,0.45)",
            filter: "blur(120px)",
          }}
        />
        {/* Gold seam */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 8,
            background: "linear-gradient(90deg,#2E7CF6,#FFD54A)",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 24,
              background: "linear-gradient(135deg,#2E7CF6,#0D1B3D)",
              border: "2px solid rgba(255,213,74,0.5)",
            }}
          >
            {/* Bolt drawn inline — an emoji here would make satori fetch a remote sprite */}
            <svg width="40" height="40" viewBox="0 0 48 48">
              <path d="M27 8 14 27h8l-3 13 17-21h-9z" fill="#FFD54A" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
              {settings.siteName}
            </div>
            <div style={{ fontSize: 18, color: "#9DB0D0", letterSpacing: 6 }}>
              TOP UP STORE
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            fontSize: 92,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -4,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>{headline}</span>
          {highlight ? <span style={{ color: "#FFD54A" }}>{highlight}</span> : null}
        </div>

        {chips.length > 0 ? (
          <div style={{ marginTop: 36, display: "flex", gap: 16 }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  padding: "12px 28px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.06)",
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Poppins", data: regular, weight: 400, style: "normal" },
        { name: "Poppins", data: black, weight: 800, style: "normal" },
      ],
    }
  );
}
