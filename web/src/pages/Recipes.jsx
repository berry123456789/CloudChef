// web/src/pages/Recipes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listRecipes } from "../lib/api.js";
import { Button, Card, Input, StatusPill, ErrorBanner } from "../components/ui.jsx";

const DIETARY_OPTIONS = [
  { key: "vegan", label: "Vegan" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "glutenfree", label: "Gluten-free" },
  { key: "dairyfree", label: "Dairy-free" },
];

const MEAL_TYPES = [
  { key: "", label: "Any meal" },
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
  { key: "snack", label: "Snack" },
];

export default function Recipes() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // search + filters
  const [q, setQ] = useState("");
  const [mealType, setMealType] = useState("");
  const [dietary, setDietary] = useState([]);

  // debounce typing
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const query = useMemo(
    () => ({ q: qDebounced, mealType, dietary }),
    [qDebounced, mealType, dietary]
  );

  const sentinelRef = useRef(null);

  async function loadFirstPage() {
    setLoading(true);
    setError("");
    try {
      const data = await listRecipes({ ...query, continuationToken: "" });
      setItems(data.recipes || []);
      setToken(data.continuationToken || "");
    } catch (e) {
      setError(e.message || String(e));
      setItems([]);
      setToken("");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!token || loading) return;
    setLoading(true);
    setError("");
    try {
      const data = await listRecipes({ ...query, continuationToken: token });
      setItems((prev) => [...prev, ...(data.recipes || [])]);
      setToken(data.continuationToken || "");
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // reload when query changes
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.q, query.mealType, JSON.stringify(query.dietary)]);

  // infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) loadMore();
      },
      { root: null, rootMargin: "300px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loading, query.q, query.mealType, JSON.stringify(query.dietary)]);

  function toggleDietary(key) {
    setDietary((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">Recipes</h1>
          <p className="text-sm text-slate-400">
            Search by title or ingredients. Filter by meal + dietary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={loadFirstPage}>
            Refresh
          </Button>
          <Button onClick={() => nav("/create")}>Create</Button>
        </div>
      </div>

      <Card title="Search & Filters" right={<StatusPill loading={loading} />}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Search (words)</label>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. chicken pasta garlic"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-300">Meal type</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">Dietary</label>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((d) => {
                  const active = dietary.includes(d.key);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDietary(d.key)}
                      className={
                        "rounded-full border px-3 py-1 text-sm transition " +
                        (active
                          ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]")
                      }
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <ErrorBanner error={error} />
        </div>
      </Card>

      <Card title={`Results (${items.length})`}>
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-[240px]">
                  <Link
                    to={`/recipes/${r.id}`}
                    className="text-lg font-semibold text-slate-100 hover:underline"
                  >
                    {r.title}
                  </Link>

                  <div className="mt-1 text-xs text-slate-400 break-all">ID: {r.id}</div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {r.mealType ? (
                      <span className="rounded-full bg-white/10 px-2 py-1 text-slate-200">
                        {r.mealType}
                      </span>
                    ) : null}

                    {r.dietary
                      ? String(r.dietary)
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean)
                          .map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-white/10 px-2 py-1 text-slate-200"
                            >
                              {t}
                            </span>
                          ))
                      : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => nav(`/edit/${r.id}`)}>
                    Edit
                  </Button>
                  <Button onClick={() => nav(`/recipes/${r.id}`)}>Open</Button>
                </div>
              </div>

              {r.instructions ? (
                <p className="mt-3 line-clamp-2 text-sm text-slate-300">{r.instructions}</p>
              ) : null}

              {Array.isArray(r.ingredients) && r.ingredients.length ? (
                <p className="mt-2 text-sm text-slate-400">
                  <span className="text-slate-300">Ingredients:</span>{" "}
                  {r.ingredients.slice(0, 10).join(", ")}
                  {r.ingredients.length > 10 ? "…" : ""}
                </p>
              ) : null}
            </div>
          ))}

          <div ref={sentinelRef} />

          {!token && !loading ? (
            <div className="pt-2 text-center text-sm text-slate-500">No more results.</div>
          ) : null}

          {loading ? (
            <div className="pt-2 text-center text-sm text-slate-500">Loading…</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
