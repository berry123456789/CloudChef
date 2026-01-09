import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Textarea, Button, ErrorBanner } from "../components/ui.jsx";
import { createRecipe, uploadRecipeImage } from "../lib/api.js";

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

function splitIngredients(s) {
  return String(s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function Create() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");

  const [mealType, setMealType] = useState("Any meal");
  const [dietary, setDietary] = useState(() => new Set());

  const [imageFile, setImageFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const dietaryList = useMemo(() => Array.from(dietary), [dietary]);

  function toggleDietTag(tag) {
    const k = normalizeDietTag(tag);
    setDietary((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        instructions: instructions.trim(),
        ingredients: splitIngredients(ingredientsText),

        // ✅ REQUIRED BY BACKEND
        mealTypes:
          mealType && mealType !== "Any meal"
            ? [mealType.toLowerCase()]
            : [],

        dietaryTags: dietaryList,
        tags: [],
      };

      const created = await createRecipe(payload);

      const id =
        created?.id ||
        created?.recipeId ||
        created?.RowKey ||
        created?.rowKey ||
        created?.key;

      if (!id) {
        throw new Error("Recipe created but no id returned by API.");
      }

      if (imageFile) {
        await uploadRecipeImage(id, imageFile);
      }

      nav(`/recipes/${encodeURIComponent(id)}`);
    } catch (err) {
      setError(err?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Create recipe</h1>
        <Button variant="secondary" onClick={() => nav(-1)}>
          Back
        </Button>
      </div>

      <ErrorBanner error={error} />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card title="Details">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">
                Title
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">
                Instructions
              </div>
              <Textarea
                rows={6}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                required
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium text-slate-200">
                Ingredients (comma separated)
              </div>
              <Input
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                placeholder="e.g. chicken, pasta, garlic"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Meal type
                </div>
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
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Dietary
                </div>
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

        <Card title="Upload image (optional)">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="file"
              accept="image/*"
              className="text-sm text-slate-200"
              onChange={(e) =>
                setImageFile(e.target.files?.[0] || null)
              }
            />
            {imageFile ? (
              <div className="text-sm text-slate-300">
                Selected: {imageFile.name}
              </div>
            ) : (
              <div className="text-sm text-slate-500">
                No file selected
              </div>
            )}
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => nav(-1)}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
