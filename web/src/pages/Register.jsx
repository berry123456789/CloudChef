import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../lib/api.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Button, Card, ErrorBanner, Input } from "../components/ui.jsx";

export default function Register() {
  const nav = useNavigate();
  const { setSession } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const loading = status === "loading";

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("loading");
    try {
      await registerUser(email.trim(), password);

      // auto-login after register
      const data = await loginUser(email.trim(), password);
      setSession(data.email, data.token);

      setStatus("done");
      nav("/");
    } catch (err) {
      setStatus("error");
      setError(err?.message || String(err));
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card title="Create account">
        <ErrorBanner error={error} />

        <form className="space-y-3" onSubmit={onSubmit}>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />
          <Button disabled={loading} type="submit">
            Create account
          </Button>
        </form>

        <div className="mt-4 text-sm text-slate-300">
          Already have an account?{" "}
          <Link className="text-emerald-300 hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
