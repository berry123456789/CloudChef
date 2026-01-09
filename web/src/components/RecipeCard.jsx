// web/src/components/RecipeCard.jsx
import { Link } from "react-router-dom";
import { Card } from "./ui.jsx";

export default function RecipeCard({ recipe }) {
  const id = recipe?.id || recipe?.rowKey || recipe?.RowKey;

  return (
    <Link to={`/recipes/${encodeURIComponent(id)}`} className="block">
      <Card>
        <div className="flex gap-4">
          {recipe?.imageUrl ? (
            <div className="h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10">
              <img
                src={recipe.imageUrl}
                alt={recipe.title || "Recipe"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-24 w-32 shrink-0 rounded-xl border border-white/10 bg-white/5" />
          )}

          <div className="min-w-0">
            <div className="truncate text-lg font-bold text-slate-100">
              {recipe?.title || "Untitled recipe"}
            </div>
            <div className="mt-1 line-clamp-2 text-sm text-slate-300">
              {recipe?.instructions || ""}
            </div>
            {Array.isArray(recipe?.ingredients) && recipe.ingredients.length ? (
              <div className="mt-2 text-xs text-slate-400">
                Ingredients: {recipe.ingredients.slice(0, 6).join(", ")}
                {recipe.ingredients.length > 6 ? "…" : ""}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </Link>
  );
}
