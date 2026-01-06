const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

app.http("UpdateRecipe", {
  methods: ["PUT", "PATCH"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id query param is required" } };

      const body = await request.json();
      const patch = { partitionKey: "recipe", rowKey: id };

      if (typeof body.title === "string") patch.title = body.title.trim();
      if (typeof body.instructions === "string") patch.instructions = body.instructions.trim();
      if (Array.isArray(body.ingredients)) patch.ingredientsJson = JSON.stringify(body.ingredients);

      const table = getRecipesTableClient();

      // merge keeps existing fields that aren’t provided
      await table.updateEntity(patch, "Merge");

      const updated = await table.getEntity("recipe", id);

      return {
        status: 200,
        jsonBody: {
          id: updated.rowKey,
          title: updated.title,
          ingredients: updated.ingredientsJson ? JSON.parse(updated.ingredientsJson) : [],
          instructions: updated.instructions,
          imageUrl: updated.imageUrl || "",
          createdAt: updated.createdAt,
        },
      };
    } catch (err) {
      if (err?.statusCode === 404) return { status: 404, jsonBody: { error: "Recipe not found" } };
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
