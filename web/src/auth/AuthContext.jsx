import { createContext, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "cloudchef_auth";

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  // restore session
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setToken(parsed?.token || "");
      setEmail(parsed?.email || "");
    } catch {
      // ignore
    }
  }, []);

  function setSession(nextEmail, nextToken) {
    setEmail(nextEmail);
    setToken(nextToken);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: nextEmail, token: nextToken }));
  }

  function logout() {
    setEmail("");
    setToken("");
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      isAuthed: Boolean(token),
      token,
      email,
      setSession,
      logout,
    }),
    [token, email]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
