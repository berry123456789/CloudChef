const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

const PARTITION_KEY = "recipe";

app.http("GetRecipe", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id is required" } };

      const table = getRecipesTableClient();
      const entity = await table.getEntity(PARTITION_KEY, id);

      const ingredients = entity.ingredientsJson ? JSON.parse(entity.ingredientsJson) : [];

      return {
        status: 200,
        jsonBody: {
          id: entity.rowKey,
          title: entity.title,
          ingredients,
          instructions: entity.instructions,
          imageUrl: entity.imageUrl || "",
          createdAt: entity.createdAt,
        },
      };
    } catch (err) {
      const status = err?.statusCode === 404 ? 404 : 500;
      return {
        status,
        jsonBody: {
          error: status === 404 ? "Recipe not found" : "Server error",
          details: status === 500 ? String(err?.message || err) : undefined,
        },
      };
    }
  },
});
