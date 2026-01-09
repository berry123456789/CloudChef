const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");

app.http("LoginUser", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "LoginUser",
  handler: async (request, context) => {
    try {
      const connectionString =
        process.env.AZURE_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage;

      if (!connectionString) {
        return { status: 500, body: "Missing AZURE_STORAGE_CONNECTION_STRING / AzureWebJobsStorage" };
      }

      const usersTable = TableClient.fromConnectionString(connectionString, "Users");

      const body = await request.json().catch(() => ({}));
      const { email, password } = body || {};

      if (!email || !password) {
        return { status: 400, body: "Email and password required" };
      }

      const emailLower = String(email).trim().toLowerCase();

      let user;
      try {
        user = await usersTable.getEntity("USER", emailLower);
      } catch {
        return { status: 401, body: "Invalid email or password" };
      }

      const ok = await bcrypt.compare(String(password), user.passwordHash);
      if (!ok) return { status: 401, body: "Invalid email or password" };

      // Simple starter token (base64 of "email:timestamp")
      const token = Buffer.from(`${emailLower}:${Date.now()}`).toString("base64");

      return { status: 200, jsonBody: { email: emailLower, token } };
    } catch (err) {
      context.error(err);
      return { status: 500, body: err?.message || String(err) };
    }
  },
});
