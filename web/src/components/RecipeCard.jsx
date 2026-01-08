import { Link } from "react-router-dom";

export default function RecipeCard({ recipe, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/recipe/${recipe.id}`}
            className="block truncate text-lg font-semibold hover:underline"
          >
            {recipe.title || "(untitled)"}
          </Link>
          <div className="mt-1 break-all font-mono text-xs text-slate-400">
            ID: {recipe.id}
          </div>
        </div>

        <div className="flex gap-2">
          <Link
            to={`/edit/${recipe.id}`}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
          >
            Edit
          </Link>

          <button
            onClick={() => onDelete?.(recipe.id)}
            className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
          >
            Delete
          </button>
        </div>
      </div>

      {recipe.instructions ? (
        <p className="mt-3 text-sm text-slate-200">{recipe.instructions}</p>
      ) : null}
    </div>
  );
}
