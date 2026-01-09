const { app } = require("@azure/functions");
const crypto = require("crypto");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUser } = require("../shared/auth");

function isLogicAppCall(request) {
  const secret = request.headers.get("x-la-secret");
  return secret && process.env.LA_SHARED_SECRET && secret === process.env.LA_SHARED_SECRET;
}

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
  if (Array.isArray(input)) {
    return input.map((x) => cleanString(x)).filter(Boolean);
  }
  return cleanString(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function cleanMealType(x) {
  const v = cleanString(x);
  if (!v) return "";
  if (v.toLowerCase() === "any meal") return "";
  return v;
}

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      // ✅ Option A: Logic App bypass via x-la-secret
      const la = isLogicAppCall(request);

      let ownerEmail = "logicapp@system";
      let user = null;

      if (!la) {
        try {
          user = requireUser(request);
        } catch (e) {
          context.error("requireUser threw:", e);
          return { status: 401, jsonBody: { error: "Unauthorized" } };
        }
        if (!user?.ok) {
          return { status: user?.status || 401, jsonBody: { error: user?.error || "Unauthorized" } };
        }
        ownerEmail = user.email;
      }

      // ---- Body
      const contentType = (request.headers.get("content-type") || "").toLowerCase();
      if (!contentType.includes("application/json")) {
        return { status: 415, jsonBody: { error: "Content-Type must be application/json" } };
      }

      let body = {};
      try {
        body = await request.json();
      } catch {
        return { status: 400, jsonBody: { error: "Invalid JSON body" } };
      }
      if (!body || typeof body !== "object") body = {};

      const title = cleanString(body.title);
      const instructions = cleanString(body.instructions);

      if (!title) return { status: 400, jsonBody: { error: "title is required" } };
      if (!instructions) return { status: 400, jsonBody: { error: "instructions is required" } };

      const cleanedIngredients = parseIngredients(body.ingredients);

      const mealTypesRaw = Array.isArray(body.mealTypes) ? body.mealTypes : [];
      const mealType =
        mealTypesRaw.length > 0 ? cleanMealType(mealTypesRaw[0]) : cleanMealType(body.mealType);

      const dietaryTags =
        cleanArrayLower(body.dietaryTags).length > 0
          ? cleanArrayLower(body.dietaryTags)
          : cleanArrayLower(body.dietary);

      const tags = cleanArrayLower(body.tags);

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
        ownerEmail: ownerEmail, // ✅ important

        mealType: mealType || "",
        dietaryTagsJson: JSON.stringify(dietaryTags),
        tagsJson: JSON.stringify(tags),
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
          ownerEmail: ownerEmail, // ✅ important

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
        jsonBody: { error: "Server error", details: String(err?.message || err) },
      };
    }
  },
});
