const { app } = require("@azure/functions");
const { getRecipesTableClient } = require("../shared/storage");

app.http("ListRecipes", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);

      // Optional: allow ?q=searchtext (simple contains search on title)
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();

      const table = getRecipesTableClient();

      // Only fetch the columns we need (faster/cheaper)
      const select = ["rowKey", "title", "createdAt", "imageUrl"];

      const results = [];
      for await (const entity of table.listEntities({ queryOptions: { select } })) {
        const item = {
          id: entity.rowKey,
          title: entity.title || "",
          createdAt: entity.createdAt || "",
          imageUrl: entity.imageUrl || "",
        };

        if (!q || item.title.toLowerCase().includes(q)) {
          results.push(item);
        }
      }

      // Sort newest first (createdAt is ISO string)
      results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return { status: 200, jsonBody: results };
    } catch (err) {
      context.error(err);
      return {
        status: 500,
        jsonBody: { error: "Server error", details: String(err?.message || err) },
      };
    }
  },
});
