// web/src/lib/api.js

// Base URL like: https://xxxxx.azurewebsites.net/api
export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function apiOk() {
  return Boolean(API_BASE) && API_BASE.startsWith("http");
}

/**
 * Read token from localStorage.
 * Supports multiple keys + session-style JSON objects.
 */
function getAuthToken() {
  try {
    // Simple keys (string tokens)
    const direct =
      localStorage.getItem("cloudchef_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token");

    if (direct) return direct;

    // JSON session object patterns
    const sessionRaw =
      localStorage.getItem("cloudchef_session") ||
      localStorage.getItem("session") ||
      localStorage.getItem("auth") ||
      localStorage.getItem("cloudchef_auth");

    if (!sessionRaw) return "";

    const session = JSON.parse(sessionRaw);

    return (
      session?.token ||
      session?.accessToken ||
      session?.jwt ||
      session?.idToken ||
      session?.authToken ||
      ""
    );
  } catch {
    return "";
  }
}

/**
 * JSON request helper that automatically adds Authorization if token exists.
 */
async function requestJson(path, options = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");

  const token = getAuthToken();

  // merge headers safely
  const headers = {
    ...(options.headers || {}),
  };

  // Only set JSON content-type if we are sending JSON
  // (upload uses FormData and must NOT set content-type manually)
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData =
    typeof FormData !== "undefined" && hasBody && options.body instanceof FormData;

  if (!isFormData) {
    headers["content-type"] = headers["content-type"] || "application/json";
  }

  // Add bearer token unless already set by caller
  if (token && !headers.Authorization && !headers.authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

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

export async function deleteRecipe(id) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  const token = getAuthToken();

  const res = await fetch(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 204) return;

  const text = await res.text();
  throw new Error(text || `HTTP ${res.status}`);
}

/**
 * Image upload (FormData)
 * Function URL: /UploadRecipeImage?id=...
 */
export async function uploadRecipeImage(id, file) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");
  if (!file) throw new Error("No file selected");

  const token = getAuthToken();

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${API_BASE}/UploadRecipeImage?id=${encodeURIComponent(id)}`, {
    method: "POST",
    body: fd,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
