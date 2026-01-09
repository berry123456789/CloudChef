function getBearerToken(request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// LoginUser creates token = base64("email:timestamp")
function getUserEmailFromRequest(request) {
  const token = getBearerToken(request);
  if (!token) return null;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const email = (decoded.split(":")[0] || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return null;
    return email;
  } catch {
    return null;
  }
}

// ✅ New unified helper used by all functions
function requireUser(request) {
  const email = getUserEmailFromRequest(request);
  if (!email) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true, email };
}

// Keep old API for any legacy callers
function requireUserEmail(request) {
  const u = requireUser(request);
  if (!u.ok) {
    const err = new Error("Missing Authorization: Bearer <token>");
    err.status = u.status;
    throw err;
  }
  return u.email;
}

module.exports = { getBearerToken, getUserEmailFromRequest, requireUser, requireUserEmail };
