// When NEXT_PUBLIC_AUTH_DISABLED=true, the login + API auth checks are bypassed
// so anyone with the URL can use the app (handy for sharing a demo to staff).
// Leave UNSET / "false" for normal, secured operation.
export const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
