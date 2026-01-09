import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiOk, getRecipe, updateRecipe as apiUpdate, uploadRecipeImage } from "../lib/api.js";
import { Button, Card, ErrorBanner, Input, Textarea, StatusPill } from "../components/ui.jsx";

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

function toMealLabel(m) {
  // stored as lower-case like "breakfast" -> display "Breakfast"
  const x = String(m || "").trim();
  if (!x) return "Any meal";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [loaded, setLoaded] = useState(null);

  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editIngredientsText, setEditIngredientsText] = useState("");

  // NEW: editable filters
  const [mealType, setMealType] = useState("Any meal");
  const [dietary, setDietary] = useState(() => new Set());

  const dietaryList = useMemo(() => Array.from(dietary), [dietary]);

  const [file, setFile] = useState(null);

  const loading = status === "loading";

  function toggleDietTag(tag) {
    const k = normalizeDietTag(tag);
    setDietary((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function load() {
    setError("");
    setStatus("loading");
    try {
      const r = await getRecipe(id);
      setLoaded(r);

      // prefill
      setEditTitle(r?.title || "");
      setEditInstructions(r?.instructions || "");
      setEditIngredientsText(Array.isArray(r?.ingredients) ? r.ingredients.join(", ") : "");

      // hydrate filters (support multiple shapes)
      const existingMeal =
        r?.mealType || (Array.isArray(r?.mealTypes) && r.mealTypes[0]) || "";
      setMealType(existingMeal ? toMealLabel(existingMeal) : "Any meal");

      const existingDiet =
        Array.isArray(r?.dietaryTags) ? r.dietaryTags : Array.isArray(r?.dietary) ? r.dietary : [];
      setDietary(new Set(existingDiet.map(normalizeDietTag)));

      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  async function onSave() {
    setError("");
    if (!apiOk()) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }

    setStatus("loading");
    try {
      const ingredients = editIngredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: editTitle.trim(),
        instructions: editInstructions.trim(),
        ingredients,

        // send in backend-friendly shape
        mealType: mealType === "Any meal" ? "" : mealType.toLowerCase(),
        dietaryTags: dietaryList,
        // optional compat for any code expecting array
        mealTypes: mealType === "Any meal" ? [] : [mealType.toLowerCase()],
      };

      // allow partial update: remove empties
      if (!payload.title) delete payload.title;
      if (!payload.instructions) delete payload.instructions;
      if (!payload.ingredients?.length) delete payload.ingredients;

      // we DO want empty strings/arrays to clear filters, so keep these keys
      // (mealType "" clears, dietaryTags [] clears)

      await apiUpdate(id, payload);
      navigate(`/recipes/${id}`);
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    } finally {
      setStatus("done");
    }
  }

  async function onUpload() {
    setError("");
    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    setStatus("loading");
    try {
      await uploadRecipeImage(id, file);
      setFile(null);
      await load(); // refresh after upload
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  useEffect(() => {
    if (!apiOk()) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/recipes/${id}`}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
        >
          ← Back
        </Link>
        <Button onClick={load} disabled={loading}>
          Refresh
        </Button>
        <div className="ml-auto">
          <StatusPill loading={loading} />
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title={`Edit recipe: ${id}`}>
        <div className="space-y-4">
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
          <Textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            placeholder="Instructions"
            rows={4}
          />
          <Input
            value={editIngredientsText}
            onChange={(e) => setEditIngredientsText(e.target.value)}
            placeholder="Ingredients (comma separated)"
          />

          {/* NEW: Meal + Dietary controls */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">Meal type</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
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

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={loading}>
              Save
            </Button>
            <Button onClick={() => navigate(`/recipes/${id}`)} disabled={loading} variant="secondary">
              Cancel
            </Button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="mb-2 text-sm font-semibold text-slate-100">Upload image</div>

            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <div className="mt-3 flex gap-2">
              <Button onClick={onUpload} disabled={loading} variant="secondary">
                Upload
              </Button>
            </div>

            {/* SHOW image (not just URL) */}
            {loaded?.imageUrl ? (
              <div className="mt-4 space-y-2">
                <img
                  src={loaded.imageUrl}
                  alt="Recipe"
                  className="max-h-72 w-full rounded-xl border border-white/10 object-cover"
                  onError={() => {
                    // If blob is private or content-type wrong, this will fail.
                    // Keep showing url for debugging.
                  }}
                />
                <div className="text-xs text-slate-400">
                  Current imageUrl:{" "}
                  <span className="break-all font-mono text-slate-200">{loaded.imageUrl}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
