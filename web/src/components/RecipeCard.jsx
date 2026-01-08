import { getApiBase, prettyDate } from "../lib/api.js";
import { Link } from "react-router-dom";

export default function RecipeCard({ recipe, onDelete }) {
  const API_BASE = getApiBase();

  const img =
    recipe.imageUrl &&
    (recipe.imageUrl.startsWith("http")
      ? recipe.imageUrl
      : `${API_BASE}${recipe.imageUrl.startsWith("/") ? "" : "/"}${recipe.imageUrl}`);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/recipes/${recipe.id}`}
            className="block truncate text-lg font-semibold hover:underline"
          >
            {recipe.title || "(untitled)"}
          </Link>

          <div className="mt-1 text-xs text-slate-400">
            <div className="break-all font-mono">ID: {recipe.id}</div>
            {recipe.createdAt ? <div>Created: {prettyDate(recipe.createdAt)}</div> : null}
          </div>
        </div>

        <button
          onClick={() => onDelete?.(recipe.id)}
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
        >
          Delete
        </button>
      </div>

      {img ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
          <img src={img} alt={recipe.title} className="h-40 w-full object-cover" loading="lazy" />
        </div>
      ) : null}

      {recipe.instructions ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-200">{recipe.instructions}</p>
      ) : null}

      {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
        <div className="mt-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Ingredients
          </div>
          <ul className="flex flex-wrap gap-2">
            {recipe.ingredients.map((i, idx) => (
              <li key={idx} className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
                {i}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Link
          to={`/edit/${recipe.id}`}
          className="inline-flex items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
        >
          Edit
        </Link>
      </div>
    </div>
  );
}

