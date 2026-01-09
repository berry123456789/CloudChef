import { Link } from "react-router-dom";
import { Button } from "./ui.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

export default function RecipeCard({ recipe, onDelete }) {
  const { isAuthed } = useAuth();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <h3 className="text-lg font-semibold text-slate-100">
        <Link to={`/recipes/${recipe.id}`} className="hover:underline">
          {recipe.title}
        </Link>
      </h3>

      <p className="mt-2 text-slate-300">{recipe.instructions}</p>

      <p className="mt-2 text-xs text-slate-500">
        ID: {recipe.id}
      </p>

      {/* ONLY show Edit/Delete if logged in */}
      {isAuthed && (
        <div className="mt-4 flex gap-2">
          <Link to={`/edit/${recipe.id}`}>
            <Button variant="secondary">Edit</Button>
          </Link>
          <Button
            variant="secondary"
            className="bg-red-500/10 text-red-200 hover:bg-red-500/20"
            onClick={() => onDelete(recipe.id)}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}
