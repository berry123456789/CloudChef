import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import { API_BASE } from "../lib/api.js";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function NavBtn({ to, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        classNames(
          "rounded-xl px-4 py-2 text-sm font-semibold transition",
          isActive
            ? "bg-emerald-500 text-slate-950"
            : "bg-white/10 text-slate-100 hover:bg-white/15"
        )
      }
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const nav = useNavigate();
  const { isAuthed, email, logout } = useAuth();

  function onLogout() {
    logout();
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">CloudChef</h1>
              <div className="mt-1 text-sm text-slate-300">
                API:{" "}
                <span className="break-all font-mono text-slate-200">{API_BASE}</span>
              </div>
              <div className="mt-2 text-sm text-slate-300">
                {isAuthed ? (
                  <span>
                    Signed in as{" "}
                    <span className="font-mono text-slate-200">{email}</span>
                  </span>
                ) : (
                  <span>Not signed in</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <NavBtn to="/" end>Recipes</NavBtn>

              {/* Create/edit should require auth */}
              <NavBtn to="/create">Create</NavBtn>

              {!isAuthed ? (
                <>
                  <NavBtn to="/login">Login</NavBtn>
                  <NavBtn to="/register">Register</NavBtn>
                </>
              ) : (
                <button
                  onClick={onLogout}
                  className="rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
