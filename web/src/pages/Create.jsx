import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiOk, createRecipe as apiCreate } from "../lib/api.js";
import { Button, Card, ErrorBanner, Input, Textarea, StatusPill } from "../components/ui.jsx";

export default function Create() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredientsText, setIngredientsText] = useState("pasta, cheese");

  const loading = status === "loading";

  async function onCreate() {
    setError("");

    if (!apiOk()) {
      setError("VITE_API_BASE is missing/invalid.");
      return;
    }

    setStatus("loading");
    try {
      const t = title.trim();
      const ins = instructions.trim();
      const ingredients = ingredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (!t) throw new Error("Title is required.");
      if (!ins) throw new Error("Instructions are required.");
      if (ingredients.length === 0) throw new Error("Add at least one ingredient.");

      const created = await apiCreate({ title: t, instructions: ins, ingredients });
      navigate(`/recipes/${created.id}`);
    } catch (e) {
      setStatus("error");
      setError(e?.message || String(e));
    } finally {
      setStatus("done");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <div className="ml-auto">
          <StatusPill loading={loading} />
        </div>
      </div>

      <ErrorBanner error={error} />

      <Card title="Create recipe">
        <div className="space-y-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Instructions"
            rows={4}
          />
          <Input
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder="Ingredients (comma separated)"
          />
          <Button onClick={onCreate} disabled={loading}>Create</Button>
        </div>
      </Card>
    </div>
  );
}

