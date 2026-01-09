const { app } = require("@azure/functions");
const crypto = require("crypto");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUser } = require("../shared/auth");

function cleanString(x) {
  return String(x || "").trim();
}

function cleanTags(input) {
  if (!Array.isArray(input)) return [];
  return input.map((t) => cleanString(t).toLowerCase()).filter(Boolean);
}

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const user = requireUser(request);
      if (!user.ok) return { status: user.status, jsonBody: { error: user.error } };

      const contentType = (request.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        return { status: 415, jsonBody: { error: "Content-Type must be application/json" } };
      }

      const body = await request.json();

      const title = cleanString(body.title);
      const instructions = cleanString(body.instructions);
      const ingredients = body.ingredients;

      // NEW fields (optional)
      const mealType = cleanString(body.mealType); // e.g. breakfast/lunch/dinner/snack
      const dietaryTags = cleanTags(body.dietaryTags); // e.g. ["vegan","gluten-free"]

      if (!title) return { status: 400, jsonBody: { error: "title is required" } };
      if (!instructions) return { status: 400, jsonBody: { error: "instructions is required" } };
      if (!Array.isArray(ingredients)) {
        return { status: 400, jsonBody: { error: "ingredients must be an array" } };
      }

      const cleanedIngredients = ingredients.map((x) => cleanString(x)).filter(Boolean);

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const entity = {
        partitionKey: "recipe",
        rowKey: id,
        title,
        instructions,
        ingredientsJson: JSON.stringify(cleanedIngredients),
        createdAt,
        updatedAt: "",
        imageUrl: "",
        imageBlobName: "",
        ownerEmail: user.email,

        // store filterable metadata
        mealType,
        dietaryTagsJson: JSON.stringify(dietaryTags),
      };

      const table = getRecipesTableClient();
      await table.createEntity(entity);

      return {
        status: 201,
        jsonBody: {
          id,
          title,
          instructions,
          ingredients: cleanedIngredients,
          imageUrl: "",
          createdAt,
          updatedAt: null,
          ownerEmail: user.email,
          mealType,
          dietaryTags,
        },
      };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
