// api/shared/auth.js
function getUserEmailFromRequest(request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const token = m[1].trim();
  try {
    // token is base64("email:timestamp")
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const email = (decoded.split(":")[0] || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return null;
    return email;
  } catch {
    return null;
  }
}

function requireUser(request) {
  const email = getUserEmailFromRequest(request);
  if (!email) {
    const err = new Error("Missing Authorization: Bearer <token>");
    err.status = 401;
    throw err;
  }
  return email;
}

module.exports = { getUserEmailFromRequest, requireUser };
