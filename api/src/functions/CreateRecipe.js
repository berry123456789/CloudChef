const { app } = require("@azure/functions");
const crypto = require("crypto");
const { getRecipesTableClient } = require("../shared/storage");

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const contentType = (request.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        return { status: 415, jsonBody: { error: "Content-Type must be application/json" } };
      }

      const body = await request.json();

      const title = (body.title || "").trim();
      const instructions = (body.instructions || "").trim();
      const ingredients = body.ingredients;

      if (!title) return { status: 400, jsonBody: { error: "title is required" } };
      if (!instructions) return { status: 400, jsonBody: { error: "instructions is required" } };
      if (!Array.isArray(ingredients)) {
        return { status: 400, jsonBody: { error: "ingredients must be an array" } };
      }

      const cleanedIngredients = ingredients.map((x) => String(x).trim()).filter(Boolean);

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const entity = {
        partitionKey: "recipe",
        rowKey: id,
        title,
        instructions,
        ingredientsJson: JSON.stringify(cleanedIngredients),
        createdAt,
        imageUrl: "",
      };

      const table = getRecipesTableClient();
      await table.createEntity(entity);

      return {
        status: 201,
        jsonBody: {
          id,
          title,
          ingredients: cleanedIngredients,
          instructions,
          imageUrl: "",
          createdAt,
        },
      };
    } catch (err) {
      context.error(err);
      return {
        status: 500,
        jsonBody: { error: "Server error", details: String(err?.message || err) },
      };
    }
  },
});
