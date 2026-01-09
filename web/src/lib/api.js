// web/src/lib/api.js

export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export function apiOk() {
  return Boolean(API_BASE) && API_BASE.startsWith("http");
}

// ---- Token helpers (robust: supports old keys too) ----
const CANON_TOKEN_KEY = "cloudchef_token";
const CANON_EMAIL_KEY = "cloudchef_email";

// If you previously stored auth under some other key, add it here:
const FALLBACK_TOKEN_KEYS = [
  "token",
  "authToken",
  "accessToken",
  "cloudchef_auth_token",
  "cloudchefToken",
  "jwt",
  "AZURE_TOKEN",
];

const FALLBACK_AUTH_OBJECT_KEYS = [
  "cloudchef_auth", // e.g. {"email":"x","token":"y"}
  "auth",
  "user",
];

function readStorage(storage, key) {
  try {
    return storage.getItem(key) || "";
  } catch {
    return "";
  }
}

function getToken() {
  // 1) canonical key first
  let t =
    readStorage(localStorage, CANON_TOKEN_KEY) ||
    readStorage(sessionStorage, CANON_TOKEN_KEY);

  if (t) return t;

  // 2) fallback raw token keys
  for (const k of FALLBACK_TOKEN_KEYS) {
    t = readStorage(localStorage, k) || readStorage(sessionStorage, k);
    if (t) return t;
  }

  // 3) fallback auth objects that contain a token field
  for (const k of FALLBACK_AUTH_OBJECT_KEYS) {
    const raw = readStorage(localStorage, k) || readStorage(sessionStorage, k);
    if (!raw) continue;
    try {
      const obj = JSON.parse(raw);
      if (obj?.token) return String(obj.token);
      if (obj?.access_token) return String(obj.access_token);
    } catch {
      // ignore
    }
  }

  return "";
}

async function request(path, options = {}) {
  if (!API_BASE) throw new Error("VITE_API_BASE missing");

  const token = getToken();

  const headers = {
    ...(options.headers || {}),
  };

  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  // Only set JSON content-type when sending JSON
  if (hasBody && !isFormData && !headers["content-type"]) {
    headers["content-type"] = "application/json";
  }

  // Attach Bearer token if we have one
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
  const token = getToken();
  const res = await fetch(`${API_BASE}/DeleteRecipe?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (res.status === 204) return;
  const text = await res.text();
  throw new Error(text || `HTTP ${res.status}`);
}

export async function uploadRecipeImage(id, file) {
  if (!file) throw new Error("No file selected");

  const fd = new FormData();
  fd.append("file", file);

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
