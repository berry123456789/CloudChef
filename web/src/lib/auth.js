const KEY = "cloudchef_auth";

export function saveAuth(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function isLoggedIn() {
  return !!getAuth()?.token;
}

