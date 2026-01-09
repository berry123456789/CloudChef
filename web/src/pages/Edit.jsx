import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { apiOk, getRecipe, updateRecipe as apiUpdate, uploadRecipeImage } from "../lib/api.js";
import { Button, Card, ErrorBanner, Input, Textarea, StatusPill } from "../components/ui.jsx";

const MEALS = ["Any meal", "Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];
const DIETARY = ["Vegan", "Vegetarian", "Gluten-free", "Dairy-free"];

function normalizeDietTag(t) {
  const x = String(t || "").toLowerCase().trim();
  if (x === "gluten-free") return "gluten-free";
  if (x === "dairy-free") return "dairy-free";
  if (x === "vegan") return "vegan";
  if (x === "vegetarian") return "vegetarian";
  return x;
}

function toMealLabel(m) {
  // stored as lower-case like "breakfast" -> display "Breakfast"
  const x = String(m || "").trim();
  if (!x) return "Any meal";
  return x.charAt(0).toUpperCase() + x.slice(1);
}

export default function Edit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [loaded, setLoaded] = useState(null);

  const [editTitle, setEditTitle] = useState("");
  const [editInstructions, setEditInstructions] = useState("");
  const [editIngredientsText, setEditIngredientsText] = useState("");

  // NEW: editable filters
  const [mealType, setMealType] = useState("Any meal");
  const [dietary, setDietary] = useState(() => new Set());

  const dietaryList = useMemo(() => Array.from(dietary), [dietary]);

  const [file, setFile] = useState(null);

  const loading = status === "loading";

  function toggleDietTag(tag) {
    const k = normalizeDietTag(tag);
    setDietary((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  async function load() {
    setError("");
    setStatus("loading");
    try {
      const r = await getRecipe(id);
      setLoaded(r);

      // prefill
      setEditTitle(r?.title || "");
      setEditInstructions(r?.instructions || "");
      setEditIngredientsText(Array.isArray(r?.ingredients) ? r.ingredients.join(", ") : "");

      // hydrate filters (support multiple shapes)
      const existingMeal =
        r?.mealType || (Array.isArray(r?.mealTypes) && r.mealTypes[0]) || "";
      setMealType(existingMeal ? toMealLabel(existingMeal) : "Any meal");

      const existingDiet =
        Array.isArray(r?.dietaryTags) ? r.dietaryTags : Array.isArray(r?.dietary) ? r.dietary : [];
      setDietary(new Set(existingDiet.map(normalizeDietTag)));

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
      const ingredients = editIngredientsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: editTitle.trim(),
        instructions: editInstructions.trim(),
        ingredients,

        // send in backend-friendly shape
        mealType: mealType === "Any meal" ? "" : mealType.toLowerCase(),
        dietaryTags: dietaryList,
        // optional compat for any code expecting array
        mealTypes: mealType === "Any meal" ? [] : [mealType.toLowerCase()],
      };

      // allow partial update: remove empties
      if (!payload.title) delete payload.title;
      if (!payload.instructions) delete payload.instructions;
      if (!payload.ingredients?.length) delete payload.ingredients;

      // we DO want empty strings/arrays to clear filters, so keep these keys
      // (mealType "" clears, dietaryTags [] clears)

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
    // eslint-disable-next-l
