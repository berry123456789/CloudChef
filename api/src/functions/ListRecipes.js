const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

function encodeCursor(token) {
  if (!token) return null;
  // token looks like: { nextPartitionKey, nextRowKey }
  return Buffer.from(JSON.stringify(token), "utf8").toString("base64");
}

function decodeCursor(cursor) {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const token = JSON.parse(json);
    // basic validation
    if (!token || typeof token !== "object") return undefined;
    return token;
  } catch {
    return undefined;
  }
}

function safeParseIngredients(entity) {
  // your CreateRecipe stores ingredientsJson (stringified array)
  const raw = entity.ingredientsJson;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

app.http("ListRecipes", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);

      // limit: how many items per page (default 10, max 50)
      const limitRaw = url.searchParams.get("limit");
      let limit = Number(limitRaw ?? "10");
      if (!Number.isFinite(limit) || limit <= 0) limit = 10;
      if (limit > 50) limit = 50;

      // cursor: continuation token from previous response
      const cursor = url.searchParams.get("cursor");
      const continuationToken = decodeCursor(cursor);

      const table = getRecipesTableClient();

      // Only recipes partition
      const queryOptions = {
        queryOptions: {
          filter: `PartitionKey eq 'recipe'`,
        },
      };

      // Get ONE page
      const pages = table
        .listEntities(queryOptions)
        .byPage({ maxPageSize: limit, continuationToken });

      const firstPage = (await pages.next()).value;

      const items = (firstPage || []).map((e) => ({
        id: e.rowKey,
        title: e.title || "",
        instructions: e.instructions || "",
        ingredients: safeParseIngredients(e),
        imageUrl: e.imageUrl || "",
        createdAt: e.createdAt || e.timestamp || null,
        imageUpdatedAt: e.imageUpdatedAt || null,
      }));

      const nextCursor = encodeCursor(firstPage?.continuationToken);

      return {
        status: 200,
        jsonBody: {
          items,
          nextCursor, // null when there is no next page
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
