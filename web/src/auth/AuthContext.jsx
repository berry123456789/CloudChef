// web/src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginUser, registerUser } from "../lib/api.js";

const AuthContext = createContext(null);

const TOKEN_KEY = "cloudchef_token";
const EMAIL_KEY = "cloudchef_email";

function readLS(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLS(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function removeLS(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [email, setEmail] = useState(() => readLS(EMAIL_KEY) || "");
  const [token, setToken] = useState(() => readLS(TOKEN_KEY) || "");

  useEffect(() => {
    if (email) writeLS(EMAIL_KEY, email);
    else removeLS(EMAIL_KEY);

    if (token) writeLS(TOKEN_KEY, token);
    else removeLS(TOKEN_KEY);
  }, [email, token]);

  async function login(emailInput, password) {
    const res = await loginUser(emailInput, password);
    // res should be: { email, token }
    setEmail(res.email || "");
    setToken(res.token || "");
    return res;
  }

  async function register(emailInput, password) {
    const res = await registerUser(emailInput, password);
    // register might return just email; don’t auto-login unless you want to
    return res;
  }

  function logout() {
    setEmail("");
    setToken("");
    // also clear old possible keys if you had them
    removeLS("token");
    removeLS("authToken");
    removeLS("cloudchef_auth");
  }

  const value = useMemo(
    () => ({
      email,
      token,
      isAuthed: Boolean(token),
      login,
      register,
      logout,
    }),
    [email, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
