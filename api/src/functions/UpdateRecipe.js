const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

app.http("UpdateRecipe", {
  methods: ["PATCH", "PUT", "POST"], // Postman friendly, PATCH is the “proper” one
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return { status: 400, jsonBody: { error: "id query parameter is required" } };

      let body = {};
      try {
        body = await request.json();
      } catch {
        return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
      }

      // Allow partial updates
      const updates = {};
      const responsePatch = {};

      if (body.title !== undefined) {
        const title = String(body.title || "").trim();
        if (!title) return { status: 400, jsonBody: { error: "title cannot be empty" } };
        updates.title = title;
        responsePatch.title = title;
      }

      if (body.instructions !== undefined) {
        const instructions = String(body.instructions || "").trim();
        if (!instructions) return { status: 400, jsonBody: { error: "instructions cannot be empty" } };
        updates.instructions = instructions;
        responsePatch.instructions = instructions;
      }

      if (body.ingredients !== undefined) {
        if (!Array.isArray(body.ingredients)) {
          return { status: 400, jsonBody: { error: "ingredients must be an array" } };
        }
        updates.ingredientsJson = JSON.stringify(body.ingredients);
        responsePatch.ingredients = body.ingredients;
      }

      if (Object.keys(updates).length === 0) {
        return {
          status: 400,
          jsonBody: { error: "Nothing to update. Provide title, instructions, and/or ingredients." },
        };
      }

      const table = getRecipesTableClient();

      // Merge update (keeps existing fields like imageUrl)
      await table.updateEntity(
        {
          partitionKey: "recipe",
          rowKey: id,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        "Merge"
      );

      // Optional: read back the updated entity so response always matches storage
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
          updatedAt: entity.updatedAt || null,
        },
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
