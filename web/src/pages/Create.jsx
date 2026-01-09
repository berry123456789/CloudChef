import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Input, Textarea, Button, ErrorBanner } from "../components/ui.jsx";
import { createRecipe, uploadRecipeImage } from "../lib/api.js";

export default function Create() {
  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsCsv, setIngredientsCsv] = useState("");
  const [mealType, setMealType] = useState("Any");
  const [dietary, setDietary] = useState([]); // ["Vegan", "Vegetarian", ...]
  const [imageFile, setImageFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDiet(tag) {
    setDietary((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        title,
        instructions,
        ingredients: ingredientsCsv,
        mealType,
        dietary, // store it on the entity so filters can work
      };

      const created = await createRecipe(payload);

      // support both {id} or {recipeId}
      const id = created?.id || created?.recipeId || created?.RowKey;
      if (!id) throw new Error("Create succeeded but no recipe id returned.");

      if (imageFile) {
        await uploadRecipeImage(id, imageFile);
      }

      nav(`/recipes/${id}`);
    } catch (err) {
      setError(err?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card title="Create recipe">
        <ErrorBanner error={error} />

        <div className="mt-4 space-y-3">
          <div>
            <div className="mb-1 text-sm text-slate-200">Title</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <div className="mb-1 text-sm text-slate-200">Instructions</div>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} required />
          </div>

          <div>
            <div className="mb-1 text-sm text-slate-200">Ingredients (comma separated)</div>
            <Input value={ingredientsCsv} onChange={(e) => setIngredientsCsv(e.target.value)} placeholder="e.g. pasta, cheese" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-1 text-sm text-slate-200">Meal type</div>
              <select
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100"
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                <option value="Any">Any meal</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Snack">Snack</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-sm text-slate-200">Dietary</div>
              <div className="flex flex-wrap gap-2">
                {["Vegan", "Vegetarian", "Gluten-free", "Dairy-free"].map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => toggleDiet(t)}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      dietary.includes(t) ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100" : "border-white/10 bg-white/5 text-slate-200"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* NEW: upload image on create */}
          <div>
            <div className="mb-1 text-sm text-slate-200">Image (optional)</div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-slate-200"
            />
          </div>

          <div className="pt-2">
            <Button disabled={loading} type="submit">
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
