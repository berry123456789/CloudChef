// api/src/shared/auth.js

function getBearerToken(request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

// Your LoginUser creates token = base64("email:timestamp")
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

function requireUserEmail(request) {
  const email = getUserEmailFromRequest(request);
  if (!email) {
    const err = new Error("Missing Authorization: Bearer <token>");
    err.status = 401;
    throw err;
  }
  return email;
}

module.exports = { getBearerToken, getUserEmailFromRequest, requireUserEmail };
