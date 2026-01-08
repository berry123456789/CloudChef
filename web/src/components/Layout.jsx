import { NavLink, Outlet } from "react-router-dom";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function Layout() {
  const linkBase =
    "rounded-xl px-3 py-2 text-sm font-semibold transition";
  const linkActive =
    "bg-emerald-500 text-slate-950";
  const linkIdle =
    "bg-white/10 text-slate-100 hover:bg-white/15";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-4xl font-bold tracking-tight">CloudChef</div>
            <div className="mt-1 text-sm text-slate-300">
              Manage recipes • Upload images • CRUD demo
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                cx(linkBase, isActive ? linkActive : linkIdle)
              }
            >
              Recipes
            </NavLink>

            <NavLink
              to="/create"
              className={({ isActive }) =>
                cx(linkBase, isActive ? linkActive : linkIdle)
              }
            >
              Create
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
