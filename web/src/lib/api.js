// web/src/lib/api.js
import { getAuth } from "./auth.js";

export const API_BASE = import.meta.env.VITE_API_BASE;

export function apiOk() {
  return typeof API_BASE === "string" && API_BASE.startsWith("http");
}

function authHeaders() {
  const auth = getAuth();
  return auth?.token ? { Authorization: `Bearer ${auth.token}` } : {};
}

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

// ---------- Auth ----------
export async function registerUser(email, password) {
  return fetchJson(`${API_BASE}/RegisterUser`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email, password) {
  return fetchJson(`${API_BASE}/LoginUser`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

// ---------- Recipes ----------
export async function listRecipes(continuationToken = "") {
  const url = continuationToken
    ? `${API_BASE}/ListRecipes?continuationToken=${encodeURIComponent(
        continuationToken
      )}`
    : `${API_BASE}/ListRecipes`;

  return fetchJson(url, {
    headers: { ...authHeaders() },
  });
}

export async function getRecipe(id) {
  return fetchJson(`${API_BASE}/GetRecipe?id=${encodeURIComponent(id)}`, {
    headers: { ...authHeaders() },
  });
}

export async function createRecipe({ title, instructions, ingredients }) {
  return fetchJson(`${API_BASE}/CreateRecipe`, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify({ title, instructions, ingredients }),
  });
}

export async function updateRecipe(id, patch) {
  return fetchJson(`${API_BASE}/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch),
  });
}

export async function deleteRecipe(id) {
  return fetchJson(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
}

export async function uploadRecipeImage(id, file) {
  const res = await fetch(
    `${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        "content-type": file.type || "application/octet-stream",
        ...authHeaders(),
      },
      body: file,
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

  if (isJson) return res.json();
  return res.text();
}
