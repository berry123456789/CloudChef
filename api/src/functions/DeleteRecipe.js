const { app } = require("@azure/functions");
const { getRecipesTableClient, getBlobContainerClient } = require("../shared/storage");

app.http("DeleteRecipe", {
  methods: ["DELETE", "POST"], // DELETE is proper; POST is Postman-friendly if needed
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return { status: 400, jsonBody: { error: "id query parameter is required" } };

      const table = getRecipesTableClient();

      // 1) Read entity (so we can also delete the blob if present)
      let entity;
      try {
        entity = await table.getEntity("recipe", id);
      } catch (e) {
        // If it doesn't exist, treat as already deleted
        // (Azure Tables SDK usually throws with statusCode 404)
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }

      // 2) Delete blob if we stored blob name
      const blobName = entity.imageBlobName || "";
      if (blobName) {
        try {
          const container = getBlobContainerClient();
          const blobClient = container.getBlobClient(blobName);
          await blobClient.deleteIfExists();
        } catch (blobErr) {
          // Don’t fail the whole delete if blob delete fails — log it
          context.warn(`Blob delete failed for ${blobName}: ${blobErr?.message || blobErr}`);
        }
      }

      // 3) Delete the table entity
      await table.deleteEntity("recipe", id);

      // 204 is the clean REST response for delete
      return { status: 204 };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
