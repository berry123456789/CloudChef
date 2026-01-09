// web/src/pages/Recipes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRecipes, apiOk } from "../lib/api.js";
import { Card, Input, Button, StatusPill, ErrorBanner } from "../components/ui.jsx";

const MEAL_OPTIONS = [
  { value: "any", label: "Any meal" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
];

const DIETARY_OPTIONS = [
  { key: "vegan", label: "Vegan" },
  { key: "vegetarian", label: "Vegetarian" },
  { key: "glutenFree", label: "Gluten-free" },
  { key: "dairyFree", label: "Dairy-free" },
];

function normalizeListResponse(data) {
  // Accept many possible response shapes
  const items =
    data?.recipes ||
    data?.items ||
    data?.value ||
    data?.entities ||
    data?.results ||
    [];
  const continuationToken =
    data?.continuationToken ||
    data?.nextContinuationToken ||
    data?.continuation ||
    data?.next ||
    "";
  return { items: Array.isArray(items) ? items : [], continuationToken: continuationToken || "" };
}

function splitWords(q) {
  return String(q || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export default function Recipes() {
  const nav = useNavigate();

  // server paging
  const [rows, setRows] = useState([]);
  const [continuationToken, setContinuationToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [noMore, setNoMore] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [query, setQuery] = useState("");
  const [meal, setMeal] = useState("any");
  const [dietary, setDietary] = useState({
    vegan: false,
    vegetarian: false,
    glutenFree: false,
    dairyFree: false,
  });

  const sentinelRef = useRef(null);
  const inflightRef = useRef(false);

  async function loadPage({ reset = false } = {}) {
    if (!apiOk()) {
      setError("VITE_API_BASE missing/invalid. Check your web app settings.");
      return;
    }
    if (inflightRef.current) return;
    if (!reset && noMore) return;

    inflightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const tokenToUse = reset ? "" : continuationToken;
      const data = await listRecipes(tokenToUse);
      const { items, continuationToken: next } = normalizeListResponse(data);

      setRows((prev) => (reset ? items : [...prev, ...items]));
      setContinuationToken(next);

      // If API returns no next token OR returned 0 items, assume no more pages
      if (!next || items.length === 0) setNoMore(true);
      else setNoMore(false);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
      inflightRef.current = false;
    }
  }

  function onRefresh() {
    setNoMore(false);
    setContinuationToken("");
    setRows([]);
    loadPage({ reset: true });
  }

  // initial load
  useEffect(() => {
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        // Load next page when user scrolls near bottom
        loadPage({ reset: false });
      },
      { root: null, rootMargin: "600px 0px", threshold: 0 }
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [continuationToken, noMore]);

  // client-side filtering
  const filtered = useMemo(() => {
    const words = splitWords(query);
    const dietaryOn = Object.entries(dietary).filter(([, v]) => v).map(([k]) => k);

    return rows.filter((r) => {
      const title = String(r.title || "").toLowerCase();
      const ingredients = Array.isArray(r.ingredients)
        ? r.ingredients.map((x) => String(x).toLowerCase())
        : [];
      const haystack = [title, ...ingredients].join(" ");

      // words must all match
      for (const w of words) {
        if (!haystack.includes(w)) return false;
      }

      // meal type filter (only if recipe has it)
      if (meal !== "any") {
        const recipeMeal = String(r.mealType || r.meal || "").toLowerCase();
        if (recipeMeal && recipeMeal !== meal) return false;
      }

      // dietary filters (only if recipe has tags)
      if (dietaryOn.length > 0) {
        const tags = r.dietary || r.tags || {};
        // allow tags as object { vegan: true } or array ["vegan"]
        const has = (k) => {
          if (Array.isArray(tags)) return tags.includes(k);
          return Boolean(tags?.[k]);
        };

        // require ALL selected to be present (change to "some" if you prefer)
        for (const k of dietaryOn) {
          if ((r.dietary || r.tags) && !has(k)) return false;
        }
      }

      return true;
    });
  }, [rows, query, meal, dietary]);

  function toggleDietary(key) {
    setDietary((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Recipes</h1>
          <p className="mt-1 text-slate-300">
            Search by title or ingredients. Filter by meal + dietary.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => nav("/create")}>Create</Button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title="Search & Filters">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm text-slate-200">Search (words)</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. chicken pasta garlic"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm text-slate-200">Meal type</div>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              >
                {MEAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-slate-950">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-sm text-slate-200">Dietary</div>
              <div className="flex flex-wrap gap-2">
                {DIETARY_OPTIONS.map((d) => {
                  const active = dietary[d.key];
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => toggleDietary(d.key)}
                      className={[
                        "rounded-full border px-3 py-1 text-sm transition",
                        active
                          ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-200"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.07]",
                      ].join(" ")}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-xs text-slate-400">
                (Dietary filters only work on recipes that actually have dietary tags saved.)
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title={`Results (${filtered.length})`}
        right={<StatusPill loading={loading} />}
      >
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="cursor-pointer text-lg font-semibold text-slate-100 hover:underline"
                    onClick={() => nav(`/recipes/${r.id}`)}
                    title={r.title}
                  >
                    {r.title || "(untitled)"}
                  </div>

                  <div className="mt-1 text-sm text-slate-300 line-clamp-2">
                    {r.instructions || ""}
                  </div>

                  <div className="mt-2 text-xs text-slate-500">ID: {r.id}</div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button variant="secondary" onClick={() => nav(`/edit/${r.id}`)}>
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}

          {!loading && filtered.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              {rows.length === 0
                ? "No recipes loaded yet (or the API returned none)."
                : "No matches for your filters."}
            </div>
          ) : null}

          <div ref={sentinelRef} />

          {!loading && noMore && rows.length > 0 ? (
            <div className="py-6 text-center text-slate-500">No more results.</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
