const { app } = require("@azure/functions");
const crypto = require("crypto");
const { getRecipesTableClient } = require("../shared/storage");

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const body = await request.json();

      const title = (body.title || "").trim();
      const instructions = (body.instructions || "").trim();
      const ingredients = body.ingredients; // array expected

      if (!title) return { status: 400, jsonBody: { error: "title is required" } };
      if (!Array.isArray(ingredients)) return { status: 400, jsonBody: { error: "ingredients must be an array" } };
      if (!instructions) return { status: 400, jsonBody: { error: "instructions is required" } };

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const entity = {
        partitionKey: "recipe",
        rowKey: id,
        title,
        instructions,
        // Table Storage stores primitives; store array as JSON string
        ingredientsJson: JSON.stringify(ingredients),
        createdAt,
        imageUrl: "", // set later by UploadRecipeImage
      };

      const table = getRecipesTableClient();
      await table.createTable().catch(() => {}); // create if missing
      await table.createEntity(entity);


      return {
        status: 201,
        jsonBody: {
          id,
          title,
          ingredients,
          instructions,
          imageUrl: "",
          createdAt,
        },
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});

