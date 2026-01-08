import { Link, useLocation } from "react-router-dom";
import { getApiBase, apiOk, classNames } from "../lib/api.js";

export default function Layout({ children }) {
  const API_BASE = getApiBase();
  const ok = apiOk();
  const location = useLocation();

  const nav = [
    { to: "/", label: "Recipes" },
    { to: "/create", label: "Create" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">
                <Link to="/" className="hover:opacity-90">CloudChef</Link>
              </h1>
              <div className="mt-1 text-sm text-slate-300">
                API:{" "}
                <span className="break-all font-mono text-slate-200">
                  {API_BASE || "(missing VITE_API_BASE)"}
                </span>
              </div>
              {!ok ? (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  VITE_API_BASE is missing/invalid. Check your deployed env setting / Vite env.
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {nav.map((n) => {
                const active = location.pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={classNames(
                      "rounded-xl px-4 py-2 text-sm font-semibold transition",
                      active ? "bg-emerald-500 text-slate-950" : "bg-white/10 text-slate-100 hover:bg-white/15"
                    )}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}

