import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiOk, loginUser, registerUser } from "../lib/api.js";
import { saveAuth } from "../lib/auth.js";
import { Button, Card, ErrorBanner, Input } from "../components/ui.jsx";

export default function Login() {
  const navigate = useNavigate();

  const ok = useMemo(() => apiOk(), []);
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loading = status === "loading";

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!ok) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }

    const em = email.trim().toLowerCase();
    const pw = password;

    if (!em) return setError("Email is required.");
    if (!pw) return setError("Password is required.");

    setStatus("loading");
    try {
      if (mode === "register") {
        await registerUser(em, pw);
      }
      const data = await loginUser(em, pw); // expect { email, token }
      saveAuth({ email: data.email, token: data.token });
      setStatus("done");
      navigate("/");
    } catch (err) {
      setStatus("error");
      setError(err?.message || String(err));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">
          {mode === "login" ? "Sign in" : "Create account"}
        </h1>
        <Link
          to="/"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
        >
          ← Back
        </Link>
      </div>

      <ErrorBanner error={error} />

      <Card
        title={mode === "login" ? "Login" : "Register"}
        right={
          <button
            type="button"
            className="text-sm font-semibold text-emerald-300 hover:text-emerald-200"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Need an account?" : "Already have one?"}
          </button>
        }
      >
        <form className="space-y-3" onSubmit={submit}>
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          <Button disabled={loading} type="submit">
            {loading ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          <p className="text-xs text-slate-400">
            This uses your Azure Functions auth endpoints (RegisterUser/LoginUser).
          </p>
        </form>
      </Card>
    </div>
  );
}
