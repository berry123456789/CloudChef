import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE;

async function fetchJson(url, options) {
    const res = await fetch(url, options);

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.toLowerCase().includes("application/json");

    if (!res.ok) {
        let details = "";
        try {
            if (isJson) {
                const j = await res.json();
                details = j?.error || j?.details || JSON.stringify(j);
            } else {
                const t = await res.text();
                details = t.slice(0, 300);
            }
        } catch {
            // ignore
        }
        throw new Error(
            `HTTP ${res.status} ${res.statusText}${details ? ` — ${details}` : ""}`
        );
    }

    if (isJson) return res.json();
    return res.text();
}

function classNames(...xs) {
    return xs.filter(Boolean).join(" ");
}

function prettyDate(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}

export default function App() {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState("");

    // list/pagination
    const [recipes, setRecipes] = useState([]);
    const [continuationToken, setContinuationToken] = useState("");
    const hasMore = Boolean(continuationToken);

    // single lookup
    const [singleId, setSingleId] = useState("");
    const [singleRecipe, setSingleRecipe] = useState(null);

    // create form
    const [newTitle, setNewTitle] = useState("");
    const [newInstructions, setNewInstructions] = useState("");
    const [newIngredientsText, setNewIngredientsText] = useState("pasta, cheese");

    // edit form
    const [editId, setEditId] = useState("");
    const [editTitle, setEditTitle] = useState("");
    const [editInstructions, setEditInstructions] = useState("");
    const [editIngredientsText, setEditIngredientsText] = useState("");

    // upload image
    const [uploadId, setUploadId] = useState("");
    const [uploadFile, setUploadFile] = useState(null);

    const apiOk = useMemo(
        () => typeof API_BASE === "string" && API_BASE.startsWith("http"),
        []
    );

    const isLoading = status === "loading";

    async function loadList(reset = false) {
        setError("");
        setStatus("loading");
        try {
            const token = reset ? "" : continuationToken;

            const url = token
                ? `${API_BASE}/ListRecipes?continuationToken=${encodeURIComponent(token)}`
                : `${API_BASE}/ListRecipes`;

            const data = await fetchJson(url);

            const items = Array.isArray(data?.items) ? data.items : [];
            const next = data?.continuationToken || "";

            setRecipes(items);
            setContinuationToken(next);
            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function loadNextPage() {
        if (!hasMore) return;
        setError("");
        setStatus("loading");
        try {
            const url = `${API_BASE}/ListRecipes?continuationToken=${encodeURIComponent(
                continuationToken
            )}`;
            const data = await fetchJson(url);

            const items = Array.isArray(data?.items) ? data.items : [];
            const next = data?.continuationToken || "";

            setRecipes(items);
            setContinuationToken(next);
            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function loadSingle() {
        setError("");
        setStatus("loading");
        try {
            const id = singleId.trim();
            if (!id) throw new Error("Enter an ID first.");
            const data = await fetchJson(
                `${API_BASE}/GetRecipe?id=${encodeURIComponent(id)}`
            );
            setSingleRecipe(data);
            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function createRecipe() {
        setError("");
        setStatus("loading");
        try {
            const title = newTitle.trim();
            const instructions = newInstructions.trim();
            const ingredients = newIngredientsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            if (!title) throw new Error("Title is required.");
            if (!instructions) throw new Error("Instructions are required.");
            if (ingredients.length === 0)
                throw new Error("Add at least one ingredient.");

            const data = await fetchJson(`${API_BASE}/CreateRecipe`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ title, instructions, ingredients }),
            });

            setNewTitle("");
            setNewInstructions("");
            setNewIngredientsText("");

            await loadList(true);

            if (data?.id) {
                setEditId(data.id);
                setUploadId(data.id);
                setSingleId(data.id);
            }

            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function updateRecipe() {
        setError("");
        setStatus("loading");
        try {
            const id = editId.trim();
            if (!id) throw new Error("Enter the recipe ID to update.");

            const payload = {};
            if (editTitle.trim()) payload.title = editTitle.trim();
            if (editInstructions.trim()) payload.instructions = editInstructions.trim();
            if (editIngredientsText.trim()) {
                payload.ingredients = editIngredientsText
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean);
            }

            if (Object.keys(payload).length === 0) {
                throw new Error("Enter at least one field to update.");
            }

            const data = await fetchJson(
                `${API_BASE}/UpdateRecipe?id=${encodeURIComponent(id)}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            await loadList(true);
            setSingleRecipe(data);
            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function deleteRecipe(id) {
        setError("");
        setStatus("loading");
        try {
            if (!id) throw new Error("Missing id to delete.");

            await fetchJson(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
                method: "DELETE",
            });

            await loadList(true);
            if (singleRecipe?.id === id) setSingleRecipe(null);

            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    async function uploadImage() {
        setError("");
        setStatus("loading");
        try {
            const id = uploadId.trim();
            if (!id) throw new Error("Enter the recipe ID to upload an image for.");
            if (!uploadFile) throw new Error("Choose an image file first.");

            const res = await fetch(
                `${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`,
                {
                    method: "POST",
                    headers: {
                        "content-type": uploadFile.type || "application/octet-stream",
                    },
                    body: uploadFile,
                }
            );

            const ct = res.headers.get("content-type") || "";
            const isJson = ct.toLowerCase().includes("application/json");
            if (!res.ok) {
                const msg = isJson
                    ? JSON.stringify(await res.json())
                    : (await res.text()).slice(0, 300);
                throw new Error(`Upload failed (HTTP ${res.status}) — ${msg}`);
            }

            setUploadFile(null);
            await loadList(true);

            if (singleId.trim() === id) {
                await loadSingle();
            }

            setStatus("done");
        } catch (e) {
            setStatus("error");
            setError(e.message || String(e));
        }
    }

    useEffect(() => {
        if (!apiOk) {
            setError(
                "VITE_API_BASE is missing/invalid. Check your .env then restart `npm run dev`."
            );
            return;
        }
        loadList(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Top bar */}
            <div className="border-b border-white/10 bg-slate-950/70 backdrop-blur">
                <div className="mx-auto max-w-6xl px-4 py-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <h1 className="text-4xl font-bold tracking-tight">CloudChef</h1>
                            <div className="mt-1 text-sm text-slate-300">
                                API:{" "}
                                <span className="break-all font-mono text-slate-200">
                                    {API_BASE}
                                </span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Button onClick={() => loadList(true)} disabled={isLoading}>
                                Refresh
                            </Button>
                            <Button
                                onClick={loadNextPage}
                                disabled={!hasMore || isLoading}
                                variant="secondary"
                            >
                                Next page
                            </Button>
                            <span className="ml-2 text-sm text-slate-400">
                                {hasMore ? "More pages available" : "No more pages"}
                            </span>
                        </div>
                    </div>

                    {/* status */}
                    <div className="mt-4">
                        {isLoading && (
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200">
                                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                                Loading…
                            </div>
                        )}
                        {error && (
                            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-100">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main */}
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
                {/* Left column: forms */}
                <div className="space-y-6 lg:col-span-1">
                    <Card title="Load single recipe">
                        <div className="flex gap-2">
                            <Input
                                value={singleId}
                                onChange={(e) => setSingleId(e.target.value)}
                                placeholder="Recipe ID"
                            />
                            <Button onClick={loadSingle} disabled={isLoading}>
                                Load
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-slate-400">
                            Tip: copy an ID from the list on the right.
                        </p>
                    </Card>

                    <Card title="Create recipe">
                        <div className="space-y-3">
                            <Input
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                placeholder="Title"
                            />
                            <Textarea
                                value={newInstructions}
                                onChange={(e) => setNewInstructions(e.target.value)}
                                placeholder="Instructions"
                                rows={3}
                            />
                            <Input
                                value={newIngredientsText}
                                onChange={(e) => setNewIngredientsText(e.target.value)}
                                placeholder="Ingredients (comma separated)"
                            />
                            <Button onClick={createRecipe} disabled={isLoading}>
                                Create
                            </Button>
                        </div>
                    </Card>

                    <Card title="Update recipe">
                        <div className="space-y-3">
                            <Input
                                value={editId}
                                onChange={(e) => setEditId(e.target.value)}
                                placeholder="Recipe ID"
                            />
                            <Input
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="New title (optional)"
                            />
                            <Textarea
                                value={editInstructions}
                                onChange={(e) => setEditInstructions(e.target.value)}
                                placeholder="New instructions (optional)"
                                rows={3}
                            />
                            <Input
                                value={editIngredientsText}
                                onChange={(e) => setEditIngredientsText(e.target.value)}
                                placeholder="New ingredients (comma separated, optional)"
                            />
                            <Button onClick={updateRecipe} disabled={isLoading} variant="secondary">
                                Update
                            </Button>
                        </div>
                    </Card>

                    <Card title="Upload image">
                        <div className="space-y-3">
                            <Input
                                value={uploadId}
                                onChange={(e) => setUploadId(e.target.value)}
                                placeholder="Recipe ID"
                            />
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="block w-full text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-white/15"
                                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <Button onClick={uploadImage} disabled={isLoading} variant="secondary">
                                Upload
                            </Button>
                            <p className="text-xs text-slate-400">
                                Your storage is private — image URLs must be accessible (SAS/proxy) for public viewing.
                                You already fixed it, so you’re good.
                            </p>
                        </div>
                    </Card>
                </div>

                {/* Right column: list + single */}
                <div className="space-y-6 lg:col-span-2">
                    {singleRecipe && (
                        <Card title="Single recipe">
                            <RecipeCard recipe={singleRecipe} onDelete={deleteRecipe} />
                        </Card>
                    )}

                    <Card title={`Recipes (${recipes.length})`}>
                        {recipes.length === 0 ? (
                            <p className="text-slate-300">No recipes yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {recipes.map((r) => (
                                    <RecipeCard key={r.id} recipe={r} onDelete={deleteRecipe} />
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}

function RecipeCard({ recipe, onDelete }) {
    const img =
        recipe.imageUrl &&
        (recipe.imageUrl.startsWith("http")
            ? recipe.imageUrl
            : `${API_BASE}${recipe.imageUrl.startsWith("/") ? "" : "/"}${recipe.imageUrl}`);

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold">
                        {recipe.title || "(untitled)"}
                    </h3>
                    <div className="mt-1 text-xs text-slate-400">
                        <div className="break-all font-mono">ID: {recipe.id}</div>
                        {recipe.createdAt ? (
                            <div>Created: {prettyDate(recipe.createdAt)}</div>
                        ) : null}
                    </div>
                </div>

                <button
                    onClick={() => onDelete(recipe.id)}
                    className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/20"
                >
                    Delete
                </button>
            </div>

            {img ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
                    <img
                        src={img}
                        alt={recipe.title}
                        className="h-40 w-full object-cover"
                        loading="lazy"
                    />
                </div>
            ) : null}

            {recipe.instructions ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-200">
                    {recipe.instructions}
                </p>
            ) : null}

            {Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 ? (
                <div className="mt-3">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Ingredients
                    </div>
                    <ul className="flex flex-wrap gap-2">
                        {recipe.ingredients.map((i, idx) => (
                            <li
                                key={idx}
                                className="rounded-full bg-white/10 px-3 py-1 text-sm text-slate-200"
                            >
                                {i}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}

/* ---------- small UI components ---------- */

function Card({ title, children }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
            </div>
            {children}
        </div>
    );
}

function Input(props) {
    return (
        <input
            {...props}
            className={classNames(
                "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            )}
        />
    );
}

function Textarea(props) {
    return (
        <textarea
            {...props}
            className={classNames(
                "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500",
                "focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            )}
        />
    );
}

function Button({ children, variant = "primary", disabled, ...props }) {
    const base =
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
        variant === "secondary"
            ? "bg-white/10 text-slate-100 hover:bg-white/15"
            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400";
    return (
        <button
            {...props}
            disabled={disabled}
            className={classNames(base, styles)}
        >
            {children}
        </button>
    );
}
