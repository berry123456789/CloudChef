const { app } = require("@azure/functions");
const crypto = require("crypto");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUser } = require("../shared/auth");

function cleanString(x) {
  return String(x ?? "").trim();
}

function cleanLower(x) {
  return cleanString(x).toLowerCase();
}

function cleanArrayLower(input) {
  if (!Array.isArray(input)) return [];
  return input.map((t) => cleanLower(t)).filter(Boolean);
}

function parseIngredients(input) {
  // Accept array OR comma-separated string
  if (Array.isArray(input)) {
    return input.map((x) => cleanString(x)).filter(Boolean);
  }
  return cleanString(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      // ---- Auth (support both "returns object" and "throws" styles)
      let user;
      try {
        user = requireUser(request);
      } catch (e) {
        context.error("requireUser threw:", e);
        return { status: 401, jsonBody: { error: "Unauthorized" } };
      }

      if (!user?.ok) {
        return { status: user?.status || 401, jsonBody: { error: user?.error || "Unauthorized" } };
      }

      // ---- Body
      const contentType = (request.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        return { status: 415, jsonBody: { error: "Content-Type must be application/json" } };
      }

      let body = {};
      try {
        body = await request.json();
      } catch (e) {
        return { status: 400, jsonBody: { error: "Invalid JSON body" } };
      }
      if (!body || typeof body !== "object") body = {};

      // ---- Required fields
      const title = cleanString(body.title);
      const instructions = cleanString(body.instructions);

      if (!title) return { status: 400, jsonBody: { error: "title is required" } };
      if (!instructions) return { status: 400, jsonBody: { error: "instructions is required" } };

      // ---- Ingredients: accept array OR string
      const cleanedIngredients = parseIngredients(body.ingredients);
      if (!cleanedIngredients.length) {
        // allow empty if you want; otherwise keep this as validation
        // return { status: 400, jsonBody: { error: "ingredients must not be empty" } };
      }

      // ---- Schema compatibility
      // NEW: mealTypes: []  (store first one as mealType string for Table)
      // OLD: mealType: "Dinner"
      const mealTypes = cleanArrayLower(body.mealTypes);
      const mealType =
        mealTypes.length > 0
          ? mealTypes[0]
          : cleanLower(body.mealType);

      // NEW: dietaryTags: []
      // OLD: dietary: []
      const dietaryTags =
        cleanArrayLower(body.dietaryTags).length > 0
          ? cleanArrayLower(body.dietaryTags)
          : cleanArrayLower(body.dietary);

      // tags (future-proof)
      const tags = cleanArrayLower(body.tags);

      // ---- Create entity
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

        // filterable metadata (safe defaults)
        mealType: mealType || "",
        dietaryTagsJson: JSON.stringify(dietaryTags),
        tagsJson: JSON.stringify(tags),
      };

      const table = getRecipesTableClient();

      // If the table client is misconfigured, this is where it usually blows up
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

          // return both shapes so frontend doesn’t care
          mealType: mealType || "",
          mealTypes: mealType ? [mealType] : [],
          dietaryTags,
          tags,
        },
      };
    } catch (err) {
      context.error("CreateRecipe error:", err);
      return {
        status: 500,
        jsonBody: {
          error: "Server error",
          details: String(err?.message || err),
        },
      };
    }
  },
});
