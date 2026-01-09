export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function getApiBase() {
  return API_BASE;
}

export function apiOk() {
  return typeof API_BASE === "string" && API_BASE.startsWith("http");
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: {
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

// ---------- Recipes ----------
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

export async function createRecipe(payload) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/CreateRecipe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function updateRecipe(id, payload) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteRecipe(id) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  // Your function supports DELETE (and sometimes POST) — keep DELETE
  const res = await fetch(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (res.status === 204) return;
  const text = await res.text();
  throw new Error(text || `HTTP ${res.status}`);
}

export async function uploadRecipeImage(id, file) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && data.error) ||
      (typeof data === "string" && data) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ---------- Auth ----------
export async function registerUser(email, password) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/RegisterUser`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function loginUser(email, password) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  return fetchJson(`${API_BASE}/LoginUser`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}
