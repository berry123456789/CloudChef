import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ErrorBanner, Input } from "../components/ui.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

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
      await login(email, password);
      setStatus("done");
      navigate("/"); // go back to recipes
    } catch (err) {
      setStatus("error");
      setError(err?.message || String(err));
    }
  }

  return (
    <div className="space-y-6">
      <Card title="Login">
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Email</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>

          <Button disabled={loading} type="submit">
            {loading ? "Signing in..." : "Sign in"}
          </Button>

          <ErrorBanner error={error} />
        </form>
      </Card>
    </div>
  );
}
