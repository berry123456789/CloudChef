// web/src/pages/Recipes.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Button, ErrorBanner, StatusPill } from "../components/ui.jsx";
import { listRecipes } from "../lib/api.js";

const MEALS = ["Any meal", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const DIETARY = ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free"];

function normalizeDietTag(t) {
  const x = String(t || "").toLowerCase().trim();
  if (x === "gluten-free") return "gluten-free";
  if (x === "dairy-free") return "dairy-free";
  if (x === "vegan") return "vegan";
  if (x === "vegetarian") return "vegetarian";
  return x;
}

function wordsFrom(s) {
  return String(s || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function extractItemsAndToken(resp) {
  // Support different backend shapes
  if (Array.isArray(resp)) return { items: resp, continuationToken: "" };

  const items =
    resp?.items ||
    resp?.recipes ||
    resp?.data ||
    resp?.value ||
    resp?.results ||
    resp?.Results ||
    [];

  const continuationToken =
    resp?.continuationToken ||
    resp?.ContinuationToken ||
    resp?.nextContinuationToken ||
    resp?.nextToken ||
    resp?.next ||
    "";

  return { items: Array.isArray(items) ? items : [], continuationToken: continuationToken || "" };
}

function getId(r) {
  return r?.id || r?.recipeId || r?.RowKey || r?.rowKey || r?.key || "";
}

function getTitle(r) {
  return r?.title || r?.name || r?.Title || "Untitled";
}

function getInstructions(r) {
  return r?.instructions || r?.body || r?.Instructions || "";
}

function getIngredients(r) {
  const ing = r?.ingredients || r?.Ingredients;
  if (Array.isArray(ing)) return ing;
  if (typeof ing === "string") {
    return ing
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

export default function Recipes() {
  const nav = useNavigate();

  // raw loaded data
  const [all, setAll] = useState([]);
  const [token, setToken] = useState("");
  const [hasMore, setHasMore] = useState(true);

  // ui state
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [meal, setMeal] = useState("Any meal");
  const [dietary, setDietary] = useState(() => new Set());

  const sentinelRef = useRef(null);

  function toggleDietTag(tag) {
    const k = normalizeDietTag(tag);
    setDietary((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function loadFirstPage() {
    setError("");
    setLoading(true);
    setAll([]);
    setToken("");
    setHasMore(true);

    try {
      const resp = await listRecipes("");
      const { items, continuationToken } = extractItemsAndToken(resp);

      setAll(items);
      setToken(continuationToken);
      setHasMore(Boolean(continuationToken));
    } catch (e) {
      setError(e?.message || "Failed to load recipes");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadNextPage() {
    if (!hasMore || !token || loadingMore) return;

    setError("");
    setLoadingMore(true);

    try {
      const resp = await listRecipes(token);
      const { items, continuationToken } = extractItemsAndToken(resp);

      setAll((prev) => [...prev, ...items]);
      setToken(continuationToken);
      setHasMore(Boolean(continuationToken));
    } catch (e) {
      setError(e?.message || "Failed to load more recipes");
      // keep hasMore as-is; user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  }

  // initial load
  useEffect(() => {
    loadFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // infinite scroll observer
  useEffect(() => {
    if (!sentinelRef.current) return;

    const el = sentinelRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (hit) loadNextPage();
      },
      { root: null, rootMargin: "600px 0px", threshold: 0.01 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasMore, loadingMore]);

  const filtered = useMemo(() => {
    const qWords = wordsFrom(q);
    const dietNeed = Array.from(dietary);

    return all.filter((r) => {
      const title = getTitle(r);
      const instructions = getInstructions(r);
      const ingredients = getIngredients(r).join(" ");

      // words search
      if (qWords.length) {
        const hay = `${title} ${ingredients} ${instructions}`.toLowerCase();
        for (const w of qWords) {
          if (!hay.includes(w)) return false;
        }
      }

      // meal filter (optional, only if recipe has mealType)
      if (meal !== "Any meal") {
        const mt = String(r?.mealType || r?.MealType || "").toLowerCase();
        if (mt && mt !== meal.toLowerCase()) return false;
      }

      // dietary filter (optional, only if recipe has dietary/tags)
      if (dietNeed.length) {
        const tags = r?.dietary || r?.tags || r?.Tags || [];
        const norm = Array.isArray(tags)
          ? tags.map(normalizeDietTag)
          : String(tags || "")
              .split(",")
              .map((x) => normalizeDietTag(x))
              .filter(Boolean);

        for (const need of dietNeed) {
          if (!norm.includes(need)) return false;
        }
      }

      return true;
    });
  }, [all, q, meal, dietary]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Recipes</h1>
          <div className="mt-1 text-sm text-slate-300">
            Search by title or ingredients. Filter by meal + dietary.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={loadFirstPage} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={() => nav("/create")}>Create</Button>
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title="Search & Filters">
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-medium text-slate-200">Search (words)</div>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="e.g. chicken pasta garlic"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">Meal type</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={meal}
                onChange={(e) => setMeal(e.target.value)}
              >
                {MEALS.map((m) => (
                  <option key={m} value={m} className="bg-slate-950">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">Dietary</div>
              <div className="flex flex-wrap gap-2">
                {DIETARY.map((t) => {
                  const k = normalizeDietTag(t);
                  const active = dietary.has(k);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleDietTag(t)}
                      className={[
                        "rounded-full border px-3 py-1 text-sm transition",
                        active
                          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
                      ].join(" ")}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <Card
          title={`Results (${filtered.length})`}
          right={
            <div className="flex items-center gap-2">
              <StatusPill loading={loading || loadingMore} />
              {!hasMore && !loading && all.length > 0 ? (
                <span className="text-sm text-slate-400">No more results.</span>
              ) : null}
            </div>
          }
        >
          {loading ? (
            <div className="py-6 text-slate-300">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-6 text-slate-400">No results.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((r) => {
                const id = getId(r);
                const title = getTitle(r);
                const instructions = getInstructions(r);
                const ingredients = getIngredients(r);

                return (
                  <button
                    key={id || title}
                    onClick={() => id && nav(`/recipes/${encodeURIComponent(id)}`)}
                    className="text-left rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
                  >
                    <div className="text-lg font-semibold text-slate-100">{title}</div>

                    {instructions ? (
                      <div className="mt-1 line-clamp-2 text-sm text-slate-300">
                        {instructions}
                      </div>
                    ) : null}

                    {ingredients.length ? (
                      <div className="mt-2 text-xs text-slate-400">
                        Ingredients: {ingredients.slice(0, 8).join(", ")}
                        {ingredients.length > 8 ? "…" : ""}
                      </div>
                    ) : null}
                  </button>
                );
              })}

              {/* sentinel for infinite scroll */}
              <div ref={sentinelRef} className="h-8" />
              {loadingMore ? <div className="py-3 text-sm text-slate-300">Loading more…</div> : null}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
