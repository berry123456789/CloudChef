// api/src/functions/UpdateRecipe.js
const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");
const { requireUserEmail } = require("../shared/auth");

app.http("UpdateRecipe", {
  methods: ["PATCH", "PUT", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const userEmail = requireUserEmail(request);

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
        const title = String(body.title || "").trim();
        if (!title) return { status: 400, jsonBody: { error: "title cannot be empty" } };
        updates.title = title;
      }

      if (body.instructions !== undefined) {
        const instructions = String(body.instructions || "").trim();
        if (!instructions) return { status: 400, jsonBody: { error: "instructions cannot be empty" } };
        updates.instructions = instructions;
      }

      if (body.ingredients !== undefined) {
        if (!Array.isArray(body.ingredients)) {
          return { status: 400, jsonBody: { error: "ingredients must be an array" } };
        }
        const cleaned = body.ingredients.map((x) => String(x).trim()).filter(Boolean);
        updates.ingredientsJson = JSON.stringify(cleaned);
      }

      // Optional filter/tag fields (safe even if UI doesn't send them yet)
      if (body.mealType !== undefined) {
        updates.mealType = String(body.mealType || "").trim();
      }
      if (body.dietary !== undefined) {
        if (!Array.isArray(body.dietary)) {
          return { status: 400, jsonBody: { error: "dietary must be an array" } };
        }
        const cleaned = body.dietary.map((x) => String(x).trim()).filter(Boolean);
        updates.dietaryJson = JSON.stringify(cleaned);
      }

      if (Object.keys(updates).length === 0) {
        return {
          status: 400,
          jsonBody: { error: "Nothing to update. Provide title, instructions, ingredients, mealType, and/or dietary." },
        };
      }

      const table = getRecipesTableClient();

      // Read existing to enforce ownership and handle legacy
      let entity;
      try {
        entity = await table.getEntity("recipe", id);
      } catch {
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }

      const owner = (entity.ownerEmail || "").trim().toLowerCase();

      // Owned by someone else => block
      if (owner && owner !== userEmail) {
        return { status: 403, jsonBody: { error: "Not allowed to edit this recipe" } };
      }

      // Legacy (no owner) => claim it
      if (!owner) {
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

      return {
        status: 200,
        jsonBody: {
          id,
          title: updated.title,
          instructions: updated.instructions,
          ingredients: updated.ingredientsJson ? JSON.parse(updated.ingredientsJson) : [],
          imageUrl: updated.imageUrl || "",
          mealType: updated.mealType || "",
          dietary: updated.dietaryJson ? JSON.parse(updated.dietaryJson) : [],
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt || null,
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
