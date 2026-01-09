export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function apiOk() {
  return Boolean(API_BASE) && API_BASE.startsWith("http");
}

async function requestJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  // Try parse json if present
  const text = await res.text();
  let data = null;
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
export function listRecipes(continuationToken = "") {
  const q = continuationToken ? `?continuationToken=${encodeURIComponent(continuationToken)}` : "";
  return requestJson(`/ListRecipes${q}`, { method: "GET" });
}

export function getRecipe(id) {
  return requestJson(`/GetRecipe?id=${encodeURIComponent(id)}`, { method: "GET" });
}

export function createRecipe(payload) {
  return requestJson(`/CreateRecipe`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecipe(id, payload) {
  return requestJson(`/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteRecipe(id) {
  return fetch(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, { method: "DELETE" }).then(
    async (res) => {
      if (res.status === 204) return;
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
  );
}

// ---------- Auth ----------
export function registerUser(email, password) {
  return requestJson(`/RegisterUser`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email, password) {
  return requestJson(`/LoginUser`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
