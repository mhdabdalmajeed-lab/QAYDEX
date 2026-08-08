"use client";

/**
 * Replaces the root layout when it (or the root error boundary) fails, so it must
 * render its own <html> and <body>. It cannot rely on providers, fonts or globals.css
 * having loaded — keep the markup and styling self-contained.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          backgroundColor: "#ffffff",
          color: "#18181b",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            QAYDEX could not start
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, margin: "0 0 1.25rem", color: "#52525b" }}>
            An unrecoverable error occurred while loading the application. Your audits and
            evidence are stored server-side and are unaffected.
          </p>
          <button
            type="button"
            onClick={unstable_retry}
            style={{
              cursor: "pointer",
              borderRadius: "0.5rem",
              border: "1px solid #18181b",
              backgroundColor: "#18181b",
              color: "#ffffff",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
            }}
          >
            Reload
          </button>
          {error.digest ? (
            <p
              style={{
                marginTop: "1rem",
                fontSize: "0.75rem",
                color: "#71717a",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            >
              Reference: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
