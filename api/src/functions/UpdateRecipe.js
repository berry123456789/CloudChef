const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUser } = require("../shared/auth");

app.http("UpdateRecipe", {
  methods: ["PATCH", "PUT", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      // Require login
      const auth = requireUser(request);
      if (!auth.ok) return { status: auth.status, jsonBody: { error: auth.error } };
      const email = auth.email;

      const url = new URL(request.url);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return { status: 400, jsonBody: { error: "id query parameter is required" } };

      let body = {};
      try {
        body = await request.json();
      } catch {
        return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
      }

      const table = getRecipesTableClient();

      // ✅ Ownership check
      let existing;
      try {
        existing = await table.getEntity("recipe", id);
      } catch {
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }

      const owner = (existing.createdBy || "").toLowerCase();
      if (!owner) {
        return { status: 403, jsonBody: { error: "Recipe has no owner set (legacy data)" } };
      }
      if (owner !== email.toLowerCase()) {
        return { status: 403, jsonBody: { error: "You can only edit your own recipes" } };
      }

      // Allow partial updates
      const updates = {};

      if (body.title !== undefined) {
        const title = String(body.title || "").trim();
        if (!title) return { status: 400, jsonBody: { error: "title cannot be empty" } };
        updates.title = title;
      }

      if (body.instructions !== undefined) {
        const instructions = String(body.instructions || "").trim();
        if (!instructions) return { status: 400, jsonBody: { error: "instructions cannot be empty" } };
        updates.instructions = instructions;
      }

      if (body.ingredients !== undefined) {
        if (!Array.isArray(body.ingredients)) {
          return { status: 400, jsonBody: { error: "ingredients must be an array" } };
        }
        updates.ingredientsJson = JSON.stringify(body.ingredients.map((x) => String(x).trim()).filter(Boolean));
      }

      if (Object.keys(updates).length === 0) {
        return {
          status: 400,
          jsonBody: { error: "Nothing to update. Provide title, instructions, and/or ingredients." },
        };
      }

      await table.updateEntity(
        {
          partitionKey: "recipe",
          rowKey: id,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        "Merge"
      );

      const entity = await table.getEntity("recipe", id);

      return {
        status: 200,
        jsonBody: {
          id,
          title: entity.title,
          instructions: entity.instructions,
          ingredients: entity.ingredientsJson ? JSON.parse(entity.ingredientsJson) : [],
          imageUrl: entity.imageUrl || "",
          createdAt: entity.createdAt,
          createdBy: entity.createdBy || "",
          updatedAt: entity.updatedAt || null,
        },
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
