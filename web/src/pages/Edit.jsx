import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiOk, getRecipe, updateRecipe as apiUpdate, uploadRecipeImage } from "../lib/api.js";
import { Button, Card, ErrorBanner, Input, Textarea, StatusPill } from "../components/ui.jsx";

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [loaded, setLoaded] = useState(null);

  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editIngredientsText, setEditIngredientsText] = useState("");

  const [file, setFile] = useState(null);

  const loading = status === "loading";

  async function load() {
    setError("");
    setStatus("loading");
    try {
      const r = await getRecipe(id);
      setLoaded(r);

      // prefill (optional)
      setEditTitle(r?.title || "");
      setEditInstructions(r?.instructions || "");
      setEditIngredientsText(Array.isArray(r?.ingredients) ? r.ingredients.join(", ") : "");

      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    }
  }

  async function onSave() {
    setError("");
    if (!apiOk()) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }

    setStatus("loading");
    try {
      const payload = {
        title: editTitle.trim(),
        instructions: editInstructions.trim(),
        ingredients: editIngredientsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      // allow partial update: remove empties
      if (!payload.title) delete payload.title;
      if (!payload.instructions) delete payload.instructions;
      if (!payload.ingredients?.length) delete payload.ingredients;

      if (Object.keys(payload).length === 0) {
        throw new Error("Enter at least one field to update.");
      }

      await apiUpdate(id, payload);
      navigate(`/recipes/${id}`);
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    } finally {
      setStatus("done");
    }
  }

  async function onUpload() {
    setError("");
    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    setStatus("loading");
    try {
      await uploadRecipeImage(id, file);
      setFile(null);
      await load(); // refresh after upload
      setStatus("done");
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
          to={`/recipes/${id}`}
          className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-white/15"
        >
          ← Back
        </Link>
        <Button onClick={load} disabled={loading}>Refresh</Button>
        <div className="ml-auto">
          <StatusPill loading={loading} />
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title={`Edit recipe: ${id}`}>
        <div className="space-y-3">
          <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
          <Textarea
            value={editInstructions}
            onChange={(e) => setEditInstructions(e.target.value)}
            placeholder="Instructions"
            rows={4}
          />
          <Input
            value={editIngredientsText}
            onChange={(e) => setEditIngredientsText(e.target.value)}
            placeholder="Ingredients (comma separated)"
          />

          <div className="flex flex-wrap gap-2">
            <Button onClick={onSave} disabled={loading}>Save</Button>
            <Button onClick={() => navigate(`/recipes/${id}`)} disabled={loading} variant="secondary">
              Cancel
            </Button>
          </div>

          <div className="mt-6 border-t border-white/10 pt-5">
            <div className="mb-2 text-sm font-semibold text-slate-100">Upload image</div>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div className="mt-3 flex gap-2">
              <Button onClick={onUpload} disabled={loading} variant="secondary">
                Upload
              </Button>
            </div>

            {loaded?.imageUrl ? (
              <div className="mt-4 text-xs text-slate-400">
                Current imageUrl: <span className="break-all font-mono text-slate-200">{loaded.imageUrl}</span>
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}

