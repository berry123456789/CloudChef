import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout() {
  const navigate = useNavigate();
  const { isAuthed, logout } = useAuth();

  const linkBase =
    "rounded-xl px-4 py-2 text-sm font-semibold transition border border-white/10";
  const active = "bg-emerald-500 text-slate-950 border-emerald-500";
  const inactive = "bg-white/5 text-slate-100 hover:bg-white/10";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">CloudChef</h1>
            <div className="mt-1 text-slate-300">
              Manage recipes • Upload images • CRUD demo
            </div>

            {/* ✅ removed API line + session text */}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                classNames(linkBase, isActive ? active : inactive)
              }
            >
              Recipes
            </NavLink>

            <NavLink
              to="/create"
              className={({ isActive }) =>
                classNames(linkBase, isActive ? active : inactive)
              }
            >
              Create
            </NavLink>

            {!isAuthed ? (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    classNames(linkBase, isActive ? active : inactive)
                  }
                >
                  Login
                </NavLink>

                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    classNames(linkBase, isActive ? active : inactive)
                  }
                >
                  Register
                </NavLink>
              </>
            ) : (
              <button
                className={classNames(linkBase, "bg-white/5 hover:bg-white/10")}
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Logout
              </button>
            )}
          </div>
        </div>

        <div className="mt-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
