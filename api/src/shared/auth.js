function decodeToken(token) {
  try {
    // token is base64 of "email:timestamp"
    const raw = Buffer.from(String(token), "base64").toString("utf8");
    const idx = raw.lastIndexOf(":");
    if (idx <= 0) return null;

    const email = raw.slice(0, idx).trim().toLowerCase();
    const ts = Number(raw.slice(idx + 1));

    if (!email || !Number.isFinite(ts)) return null;
    return { email, ts };
  } catch {
    return null;
  }
}

function getBearerToken(request) {
  const h = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m ? m[1].trim() : "";
}

function requireUser(request) {
  const token = getBearerToken(request);
  if (!token) return { ok: false, status: 401, error: "Missing Authorization: Bearer <token>" };

  const decoded = decodeToken(token);
  if (!decoded?.email) return { ok: false, status: 401, error: "Invalid token" };

  return { ok: true, email: decoded.email };
}

module.exports = { requireUser, decodeToken, getBearerToken };
