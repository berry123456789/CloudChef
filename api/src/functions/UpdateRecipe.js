// api/src/functions/UpdateRecipe.js
const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUserEmail } = require("../shared/auth");

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
  // Accept array OR comma-separated string
  if (Array.isArray(input)) {
    return input.map((x) => cleanString(x)).filter(Boolean);
  }
  return cleanString(input)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

// Keep meal type UI-friendly ("Dinner") and allow "Any meal" => empty
function cleanMealType(x) {
  const v = cleanString(x);
  if (!v) return "";
  if (v.toLowerCase() === "any meal") return "";
  return v;
}

app.http("UpdateRecipe", {
  methods: ["PATCH", "PUT", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const la = isLogicAppCall(request);

      // ✅ If NOT Logic App, require normal login
      let userEmail = "logicapp@system";
      if (!la) {
        userEmail = requireUserEmail(request);
      }

      const url = new URL(request.url);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return { status: 400, jsonBody: { error: "id query parameter is required" } };

      let body = {};
      try {
        body = await request.json();
      } catch {
        return { status: 400, jsonBody: { error: "Request body must be valid JSON" } };
      }

      const updates = {};

      // Partial updates allowed
      if (body.title !== undefined) {
        const title = cleanString(body.title);
        if (!title) return { status: 400, jsonBody: { error: "title cannot be empty" } };
        updates.title = title;
      }

      if (body.instructions !== undefined) {
        const instructions = cleanString(body.instructions);
        if (!instructions) return { status: 400, jsonBody: { error: "instructions cannot be empty" } };
        updates.instructions = instructions;
      }

      if (body.ingredients !== undefined) {
        const cleaned = parseIngredients(body.ingredients);
        updates.ingredientsJson = JSON.stringify(cleaned);
      }

      // ✅ Meal type (support both old + new shapes)
      // old: mealType: "Dinner"
      // new: mealTypes: ["Dinner"]
      if (body.mealTypes !== undefined) {
        const mt = Array.isArray(body.mealTypes) ? body.mealTypes : [];
        updates.mealType = mt.length ? cleanMealType(mt[0]) : "";
      } else if (body.mealType !== undefined) {
        updates.mealType = cleanMealType(body.mealType);
      }

      // ✅ Dietary (store consistently in dietaryTagsJson like CreateRecipe)
      // old UI: dietary: ["vegan"]
      // new: dietaryTags: ["vegan"]
      if (body.dietaryTags !== undefined) {
        const dt = cleanArrayLower(body.dietaryTags);
        updates.dietaryTagsJson = JSON.stringify(dt);
      } else if (body.dietary !== undefined) {
        const dt = cleanArrayLower(body.dietary);
        updates.dietaryTagsJson = JSON.stringify(dt);
      }

      if (Object.keys(updates).length === 0) {
        return {
          status: 400,
          jsonBody: { error: "Nothing to update. Provide title/instructions/ingredients/mealType/dietary." },
        };
      }

      const table = getRecipesTableClient();

      // Read existing to enforce ownership (only for real users)
      let entity;
      try {
        entity = await table.getEntity("recipe", id);
      } catch {
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }

      const owner = cleanLower(entity.ownerEmail || "");

      // ✅ Only enforce owner check for real users, NOT logic app
      if (!la && owner && owner !== userEmail) {
        return { status: 403, jsonBody: { error: "Not allowed to edit this recipe" } };
      }

      // Legacy (no owner) => claim it (only if real user)
      if (!la && !owner) {
        updates.ownerEmail = userEmail;
      }

      await table.updateEntity(
        {
          partitionKey: "recipe",
          rowKey: id,
          ...updates,
          updatedAt: new Date().toISOString(),
        },
        "Merge"
      );

      const updated = await table.getEntity("recipe", id);

      const ingredients = updated.ingredientsJson ? JSON.parse(updated.ingredientsJson) : [];
      const dietaryTags = updated.dietaryTagsJson ? JSON.parse(updated.dietaryTagsJson) : [];

      return {
        status: 200,
        jsonBody: {
          id,
          title: updated.title,
          instructions: updated.instructions,
          ingredients,
          imageUrl: updated.imageUrl || "",
          mealType: updated.mealType || "",
          mealTypes: updated.mealType ? [updated.mealType] : [],
          dietaryTags,
          dietary: dietaryTags, // return both shapes
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt || null,
          ownerEmail: updated.ownerEmail || "",
        },
      };
    } catch (err) {
      const status = err?.status || 500;
      if (status !== 500) return { status, jsonBody: { error: err.message } };

      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
