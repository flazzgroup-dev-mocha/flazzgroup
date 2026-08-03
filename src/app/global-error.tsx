"use client";

/**
 * Last-resort boundary. It replaces the root layout, so it must render its own
 * <html> and cannot rely on the fonts or global CSS variables.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "#071321",
          color: "#eef4ff",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>
            Situs sedang bermasalah
          </h1>
          <p style={{ color: "#9db0d0", marginTop: "0.75rem", lineHeight: 1.6 }}>
            Kami sedang memperbaikinya. Coba muat ulang beberapa saat lagi.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.75rem",
              borderRadius: 999,
              border: "none",
              background: "#FFD54A",
              color: "#071321",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Coba lagi
          </button>
          {error.digest ? (
            <p style={{ marginTop: "2rem", fontSize: "0.7rem", color: "#6d80a3" }}>
              Ref: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
