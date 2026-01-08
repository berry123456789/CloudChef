import { useEffect, useState } from "react";
import { listRecipes, deleteRecipe as apiDelete, apiOk } from "../lib/api.js";
import { Button, Card, ErrorBanner, Input, StatusPill } from "../components/ui.jsx";
import RecipeCard from "../components/RecipeCard.jsx";
import { useNavigate } from "react-router-dom";

export default function Recipes() {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [recipes, setRecipes] = useState([]);
  const [continuationToken, setContinuationToken] = useState("");
  const hasMore = Boolean(continuationToken);

  const [singleId, setSingleId] = useState("");
  const navigate = useNavigate();

  const loading = status === "loading";

  async function load(reset = true) {
    setError("");
    setStatus("loading");
    try {
      const data = await listRecipes(reset ? "" : continuationToken);
      setRecipes(Array.isArray(data?.items) ? data.items : []);
      setContinuationToken(data?.continuationToken || "");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  async function nextPage() {
    if (!hasMore) return;
    setError("");
    setStatus("loading");
    try {
      const data = await listRecipes(continuationToken);
      setRecipes(Array.isArray(data?.items) ? data.items : []);
      setContinuationToken(data?.continuationToken || "");
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  async function onDelete(id) {
    setError("");
    setStatus("loading");
    try {
      await apiDelete(id);
      await load(true);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  function goToSingle() {
    const id = singleId.trim();
    if (!id) return;
    navigate(`/recipes/${id}`);
  }

  useEffect(() => {
    if (!apiOk()) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => load(true)} disabled={loading}>Refresh</Button>
        <Button onClick={nextPage} disabled={!hasMore || loading} variant="secondary">
          Next page
        </Button>
        <span className="ml-2 text-sm text-slate-400">
          {hasMore ? "More pages available" : "No more pages"}
        </span>
        <div className="ml-auto">
          <StatusPill loading={loading} />
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card
        title="Open a recipe by ID"
        right={<span className="text-xs text-slate-400">Tip: copy an ID from a card</span>}
      >
        <div className="flex gap-2">
          <Input value={singleId} onChange={(e) => setSingleId(e.target.value)} placeholder="Recipe ID" />
          <Button onClick={goToSingle} disabled={loading}>Open</Button>
        </div>
      </Card>

      <Card title={`Recipes (${recipes.length})`}>
        {recipes.length === 0 ? (
          <p className="text-slate-300">No recipes yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} onDelete={onDelete} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

