const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

app.http("RegisterUser", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "RegisterUser",
  handler: async (request, context) => {
    try {
      if (!connectionString) {
        return { status: 500, body: "Missing AZURE_STORAGE_CONNECTION_STRING" };
      }

      const usersTable = TableClient.fromConnectionString(connectionString, "Users");

      const body = await request.json().catch(() => ({}));
      const { email, password } = body || {};

      if (!email || !password) {
        return { status: 400, body: "Email and password required" };
      }

      const emailLower = String(email).trim().toLowerCase();

      // check if user exists
      try {
        await usersTable.getEntity("USER", emailLower);
        return { status: 409, body: "User already exists" };
      } catch {
        // not found is fine
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await usersTable.createEntity({
        partitionKey: "USER",
        rowKey: emailLower,
        passwordHash,
        createdAt: new Date().toISOString(),
      });

      return {
        status: 201,
        jsonBody: { email: emailLower },
      };
    } catch (err) {
      context.error(err);
      return { status: 500, body: err?.message || String(err) };
    }
  },
});
