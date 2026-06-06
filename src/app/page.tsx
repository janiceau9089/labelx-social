"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { AUTH_DISABLED } from "@/lib/config";

export default function Home() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (AUTH_DISABLED || user) router.replace("/workflow");
  }, [user, router]);

  return (
    <div className="login">
      <div className="card" style={{ padding: 32 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/labelx.png" alt="LabelX" style={{ height: 40, display: "block", margin: "0 auto 8px" }} />
        <div className="muted" style={{ letterSpacing: 1, marginBottom: 20 }}>
          BORN TO CREATE · BUILT TO LEAD
        </div>
        <button className="btn" style={{ width: "100%" }} disabled={loading} onClick={() => signIn()}>
          Sign in with Google
        </button>
        <div className="muted" style={{ marginTop: 14 }}>
          Access is limited to approved team emails.
        </div>
      </div>
    </div>
  );
}
