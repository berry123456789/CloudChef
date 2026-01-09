// web/src/pages/Create.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRecipe } from "../lib/api.js";
import { Card, Input, Textarea, Button, ErrorBanner } from "../components/ui.jsx";

const MEAL_OPTIONS = [
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

export default function Create() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("");

  const [mealType, setMealType] = useState("dinner");
  const [dietary, setDietary] = useState({
    vegan: false,
    vegetarian: false,
    glutenFree: false,
    dairyFree: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDietary(key) {
    setDietary((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const ingredients = ingredientsText
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      const payload = {
        title,
        instructions,
        ingredients,
        mealType,
        dietary,
      };

      const created = await createRecipe(payload);
      nav(`/recipes/${created.id}`);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-slate-100">Create recipe</h1>
        <Button variant="secondary" onClick={() => nav("/")}>
          Back
        </Button>
      </div>

      <ErrorBanner error={error} />

      <Card title="Details">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <div className="mb-2 text-sm text-slate-200">Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pasta" />
          </div>

          <div>
            <div className="mb-2 text-sm text-slate-200">Instructions</div>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Write the steps…"
              rows={6}
            />
          </div>

          <div>
            <div className="mb-2 text-sm text-slate-200">Ingredients (comma separated)</div>
            <Input
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              placeholder="e.g. pasta, cheese, garlic"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-sm text-slate-200">Meal type</div>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
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
            </div>
          </div>

          <div className="pt-2">
            <Button disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
