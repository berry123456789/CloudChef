// web/src/lib/api.js

export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function apiOk() {
  return Boolean(API_BASE) && API_BASE.startsWith("http");
}

// Where we store auth (match what AuthContext uses)
const TOKEN_KEY = "cloudchef_token";

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

async function request(path, options = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");

  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Only add JSON content-type when we actually send JSON
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (hasBody && !isFormData && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  // Add auth header if token exists
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
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
  const q = continuationToken
    ? `?continuationToken=${encodeURIComponent(continuationToken)}`
    : "";
  return request(`/ListRecipes${q}`, { method: "GET" });
}

export function getRecipe(id) {
  return request(`/GetRecipe?id=${encodeURIComponent(id)}`, { method: "GET" });
}

export function createRecipe(payload) {
  return request(`/CreateRecipe`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRecipe(id, payload) {
  return request(`/UpdateRecipe?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRecipe(id) {
  // Delete returns 204 sometimes
  const token = getToken();
  const res = await fetch(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 204) return;
  const text = await res.text();
  throw new Error(text || `HTTP ${res.status}`);
}

// Upload image (FormData) — this was missing and caused your console error
export async function uploadRecipeImage(id, file) {
  if (!file) throw new Error("No file selected");

  const fd = new FormData();
  fd.append("file", file);

  // FormData => DO NOT set content-type manually
  return request(`/UploadRecipeImage?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: fd,
  });
}

// ---------- Auth ----------
export function registerUser(email, password) {
  return request(`/RegisterUser`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function loginUser(email, password) {
  return request(`/LoginUser`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}
