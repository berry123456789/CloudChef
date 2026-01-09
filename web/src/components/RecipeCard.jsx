import { Link } from "react-router-dom";

export default function RecipeCard({ recipe }) {
  const id = recipe?.id || recipe?.rowKey || recipe?.RowKey;

  return (
    <Link
      to={`/recipes/${encodeURIComponent(id)}`}
      className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06]"
    >
      <div className="flex gap-4">
        {/* ✅ Thumbnail */}
        <div className="h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5">
          {recipe?.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt={recipe?.title || "Recipe image"}
              className="h-full w-full object-cover"   // ✅ fits nicely
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
              No image
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-bold text-slate-100">
            {recipe?.title || "Untitled"}
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
    </Link>
  );
}
