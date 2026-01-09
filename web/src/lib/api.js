const API_BASE = import.meta.env.VITE_API_BASE;

// --- helpers ---
export function apiOk() {
  return typeof API_BASE === "string" && API_BASE.startsWith("http");
}

function getStoredToken() {
  try {
    const raw = localStorage.getItem("cloudchef_auth");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.token || "";
  } catch {
    return "";
  }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (!res.ok) {
    let details = "";
    try {
      details = isJson ? JSON.stringify(await res.json()) : (await res.text()).slice(0, 300);
    } catch {
      // ignore
    }
    throw new Error(`HTTP ${res.status} ${res.statusText}${details ? ` — ${details}` : ""}`);
  }

  return isJson ? res.json() : res.text();
}

function withAuthHeaders(headers = {}) {
  const token = getStoredToken();
  if (!token) return headers;

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

// --- auth endpoints ---
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

// --- recipe endpoints ---
export async function listRecipes(continuationToken = "") {
  const url = continuationToken
    ? `${API_BASE}/ListRecipes?continuationToken=${encodeURIComponent(continuationToken)}`
    : `${API_BASE}/ListRecipes`;

  return fetchJson(url, {
    headers: withAuthHeaders(),
  });
}

export async function getRecipe(id) {
  return fetchJson(`${API_BASE}/GetRecipe?id=${encodeURIComponent(id)}`, {
    headers: withAuthHeaders(),
  });
}

export async function createRecipe({ title, instructions, ingredients }) {
  return fetchJson(`${API_BASE}/CreateRecipe`, {
    method: "POST",
    headers: withAuthHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ title, instructions, ingredients }),
  });
}

export async function updateRecipe(id, patch) {
  return fetchJson(`${API_BASE}/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: withAuthHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(patch),
  });
}

export async function deleteRecipe(id) {
  return fetchJson(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
}

export async function uploadRecipeImage(id, file) {
  const res = await fetch(`${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`, {
    method: "POST",
    headers: withAuthHeaders({
      "content-type": file.type || "application/octet-stream",
    }),
    body: file,
  });

  if (!res.ok) {
    const t = (await res.text()).slice(0, 300);
    throw new Error(`Upload failed (HTTP ${res.status}) — ${t}`);
  }
  return true;
}
