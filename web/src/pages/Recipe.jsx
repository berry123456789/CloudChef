import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiOk, getRecipe, deleteRecipe as apiDelete } from "../lib/api.js";
import { Button, Card, ErrorBanner, StatusPill } from "../components/ui.jsx";
import RecipeCard from "../components/RecipeCard.jsx";

export default function Recipe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState(null);

  const loading = status === "loading";

  async function load() {
    setError("");
    setStatus("loading");
    try {
      const data = await getRecipe(id);
      setRecipe(data);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  async function onDelete() {
    setError("");
    setStatus("loading");
    try {
      await apiDelete(id);
      navigate("/");
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
          to="/"
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
        >
          ← Back
        </Link>
        <Button onClick={load} disabled={loading}>Refresh</Button>
        <Button onClick={() => navigate(`/edit/${id}`)} disabled={loading} variant="secondary">
          Edit
        </Button>
        <Button onClick={onDelete} disabled={loading} variant="secondary" className="bg-red-500/10 text-red-200 hover:bg-red-500/20">
          Delete
        </Button>
        <div className="ml-auto">
          <StatusPill loading={loading} />
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title="Recipe">
        {recipe ? <RecipeCard recipe={recipe} onDelete={() => onDelete()} /> : <p className="text-slate-300">No recipe loaded.</p>}
      </Card>
    </div>
  );
}

