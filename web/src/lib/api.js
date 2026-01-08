const API_BASE = import.meta.env.VITE_API_BASE;

export function getApiBase() {
  return API_BASE;
}

export function apiOk() {
  return typeof API_BASE === "string" && API_BASE.startsWith("http");
}

export function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export function prettyDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export async function fetchJson(url, options) {
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

export async function listRecipes(continuationToken = "") {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  const url = continuationToken
    ? `${API_BASE}/ListRecipes?continuationToken=${encodeURIComponent(continuationToken)}`
    : `${API_BASE}/ListRecipes`;

  return fetchJson(url);
}

export async function getRecipe(id) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/GetRecipe?id=${encodeURIComponent(id)}`);
}

export async function createRecipe({ title, instructions, ingredients }) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/CreateRecipe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title, instructions, ingredients }),
  });
}

export async function updateRecipe(id, payload) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteRecipe(id) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function uploadRecipeImage(id, file) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  if (!file) throw new Error("Missing file");

  const res = await fetch(`${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: {
      "content-type": file.type || "application/octet-stream",
    },
    body: file,
  });

  const ct = res.headers.get("content-type") || "";
  const isJson = ct.toLowerCase().includes("application/json");

  if (!res.ok) {
    const msg = isJson
      ? JSON.stringify(await res.json())
      : (await res.text()).slice(0, 300);
    throw new Error(`Upload failed (HTTP ${res.status}) — ${msg}`);
  }

  // some functions return json, some return text; accept either
  return isJson ? res.json() : res.text();
}

