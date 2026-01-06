const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

app.http("GetRecipe", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id query param is required" } };

      const table = getRecipesTableClient();
      const entity = await table.getEntity("recipe", id);

      return {
        status: 200,
        jsonBody: {
          id: entity.rowKey,
          title: entity.title,
          ingredients: entity.ingredientsJson ? JSON.parse(entity.ingredientsJson) : [],
          instructions: entity.instructions,
          imageUrl: entity.imageUrl || "",
          createdAt: entity.createdAt,
        },
      };
    } catch (err) {
      // Table SDK throws 404 as RestError
      if (err?.statusCode === 404) return { status: 404, jsonBody: { error: "Recipe not found" } };
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
