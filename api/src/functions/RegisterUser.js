import { TableClient } from "@azure/data-tables";
import bcrypt from "bcryptjs";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const usersTable = TableClient.fromConnectionString(connectionString, "Users");

export default async function (context, req) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      context.res = { status: 400, body: "Email and password required" };
      return;
    }

    const emailLower = email.toLowerCase();

    // check if user exists
    try {
      await usersTable.getEntity("USER", emailLower);
      context.res = { status: 409, body: "User already exists" };
      return;
    } catch {
      // expected if not found
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await usersTable.createEntity({
      partitionKey: "USER",
      rowKey: emailLower,
      passwordHash,
      createdAt: new Date().toISOString()
    });

    context.res = {
      status: 201,
      body: { email: emailLower }
    };
  } catch (err) {
    context.res = { status: 500, body: err.message };
  }
}
