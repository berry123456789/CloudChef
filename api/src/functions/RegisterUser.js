const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const usersTable = TableClient.fromConnectionString(connectionString, "Users");

app.http("RegisterUser", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "RegisterUser",
  handler: async (request, context) => {
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
        return { status: 400, jsonBody: { error: "Email and password required" } };
      }

      const emailLower = email.toLowerCase();

      // check if user exists
      try {
        await usersTable.getEntity("USER", emailLower);
        return { status: 409, jsonBody: { error: "User already exists" } };
      } catch {
        // not found is expected
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await usersTable.createEntity({
        partitionKey: "USER",
        rowKey: emailLower,
        passwordHash,
        createdAt: new Date().toISOString(),
      });

      return { status: 201, jsonBody: { email: emailLower } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: err.message } };
    }
  },
});
