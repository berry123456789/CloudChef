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
    const user = await usersTable.getEntity("USER", emailLower);

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      context.res = { status: 401, body: "Invalid credentials" };
      return;
    }

    context.res = {
      status: 200,
      body: { email: emailLower }
    };
  } catch {
    context.res = { status: 401, body: "Invalid credentials" };
  }
}
