const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

app.http("DeleteRecipe", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id query param is required" } };

      const table = getRecipesTableClient();
      await table.deleteEntity("recipe", id);

      return { status: 204 };
    } catch (err) {
      if (err?.statusCode === 404) return { status: 404, jsonBody: { error: "Recipe not found" } };
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
