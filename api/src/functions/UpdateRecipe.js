const { app } = require("@azure/functions");
const { getRecipesTableClient, PARTITION_KEY } = require("../shared/storage");

app.http("UpdateRecipe", {
  methods: ["PUT", "PATCH"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id is required" } };

      const body = await request.json();

      const table = getRecipesTableClient();
      const existing = await table.getEntity(PARTITION_KEY, id);

      const title = body.title !== undefined ? String(body.title).trim() : existing.title;
      const instructions =
        body.instructions !== undefined ? String(body.instructions).trim() : existing.instructions;

      let ingredientsJson = existing.ingredientsJson;
      if (body.ingredients !== undefined) {
        if (!Array.isArray(body.ingredients)) {
          return { status: 400, jsonBody: { error: "ingredients must be an array" } };
        }
        ingredientsJson = JSON.stringify(body.ingredients);
      }

      const updated = {
        partitionKey: PARTITION_KEY,
        rowKey: id,
        title,
        instructions,
        ingredientsJson,
        createdAt: existing.createdAt,
        imageUrl: existing.imageUrl || "",
      };

      // replace = full entity update
      await table.updateEntity(updated, "Replace");

      return {
        status: 200,
        jsonBody: {
          id,
          title,
          ingredients: JSON.parse(ingredientsJson || "[]"),
          instructions,
          imageUrl: updated.imageUrl,
          createdAt: updated.createdAt,
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
