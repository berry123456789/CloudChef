import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser } from "../lib/api.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "cloudchef_token";
const EMAIL_KEY = "cloudchef_email";

function safeGet(key) {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");

  // ✅ one-time session restore (MUST always finish)
  useEffect(() => {
    const savedEmail = safeGet(EMAIL_KEY);
    const savedToken = safeGet(TOKEN_KEY);

    setEmail(savedEmail);
    setToken(savedToken);

    setLoading(false); // <- this is the key bit: never stay stuck
  }, []);

  // persist changes
  useEffect(() => {
    if (email) safeSet(EMAIL_KEY, email);
    else safeRemove(EMAIL_KEY);

    if (token) safeSet(TOKEN_KEY, token);
    else safeRemove(TOKEN_KEY);
  }, [email, token]);

  async function login(emailInput, password) {
    const res = await loginUser(emailInput, password); // { email, token }
    setEmail(res.email || "");
    setToken(res.token || "");
    return res;
  }

  async function register(emailInput, password) {
    return registerUser(emailInput, password);
  }

  function logout() {
    setEmail("");
    setToken("");
    safeRemove(EMAIL_KEY);
    safeRemove(TOKEN_KEY);

    // optional cleanup of old keys if you ever used them
    safeRemove("token");
    safeRemove("authToken");
    safeRemove("cloudchef_auth");
  }

  const value = useMemo(
    () => ({
      loading,
      email,
      token,
      isAuthed: Boolean(token),
      login,
      register,
      logout,
    }),
    [loading, email, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
