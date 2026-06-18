"use client";
// App Router error boundary. Catches client-side exceptions thrown during
// rendering anywhere under this segment and shows a recoverable screen
// instead of the generic "Application error: a client-side exception has
// occurred" blank page. Does not catch errors in event handlers (e.g. an
// onClick) — those are handled locally with try/catch where they occur
// (see downloadOne/downloadAll in workflow/page.tsx for an example).
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#f4f4f5", padding: 24 }}>
      <div style={{ maxWidth: 440, textAlign: "center" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>Đã có lỗi xảy ra</h2>
        <p style={{ color: "#8a8a90", fontSize: 13.5, lineHeight: 1.6, marginBottom: 20 }}>
          Một phần của trang gặp lỗi không mong muốn. Thử lại, hoặc tải lại trang nếu lỗi vẫn còn.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={() => reset()}
            style={{ background: "#fff", color: "#000", border: "none", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Thử lại
          </button>
          <button
            onClick={() => (window.location.href = "/workflow")}
            style={{ background: "transparent", color: "#f4f4f5", border: "1px solid #26262a", padding: "10px 18px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
          >
            Về Workflow
          </button>
        </div>
      </div>
    </div>
  );
}
