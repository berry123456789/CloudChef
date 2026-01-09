import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser as apiLoginUser, registerUser as apiRegisterUser } from "../lib/api.js";

const STORAGE_KEY = "cloudchef_auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [ready, setReady] = useState(false);

  // Restore session on first load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email && parsed?.token) {
          setEmail(String(parsed.email));
          setToken(String(parsed.token));
        }
      }
    } catch {
      // ignore corrupted storage
    } finally {
      setReady(true);
    }
  }, []);

  // Persist session whenever it changes
  useEffect(() => {
    if (!ready) return;
    if (email && token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, token }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [email, token, ready]);

  async function login(emailInput, password) {
    const res = await apiLoginUser(emailInput, password);
    setEmail(res.email);
    setToken(res.token);
    return res;
  }

  async function register(emailInput, password) {
    const res = await apiRegisterUser(emailInput, password);
    return res;
  }

  function logout() {
    setEmail("");
    setToken("");
    localStorage.removeItem(STORAGE_KEY);
  }

  const value = useMemo(
    () => ({
      ready,
      isAuthed: Boolean(email && token),
      email,
      token,
      login,
      register,
      logout,
    }),
    [ready, email, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const v = useContext(AuthContext);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
}
