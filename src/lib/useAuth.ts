"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { AUTH_DISABLED } from "./config";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);
  return {
    user,
    loading,
    signIn: () => signInWithPopup(auth, googleProvider),
    signOut: () => signOut(auth),
  };
}

/** Fetch helper that attaches the Firebase ID token (skipped when auth is disabled). */
export async function authFetch(user: User | null, input: string, init: RequestInit = {}) {
  const headers: Record<string, string> = { ...(init.headers as any), "Content-Type": "application/json" };
  if (user && !AUTH_DISABLED) headers.Authorization = `Bearer ${await user.getIdToken()}`;
  return fetch(input, { ...init, headers });
}
