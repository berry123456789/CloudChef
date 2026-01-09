// api/src/functions/DeleteRecipe.js
const { app } = require("@azure/functions");
const { getRecipesTableClient, getBlobContainerClient } = require("../shared/storage");
const { requireUserEmail } = require("../shared/auth");

app.http("DeleteRecipe", {
  methods: ["DELETE", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const userEmail = requireUserEmail(request);

      const url = new URL(request.url);
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) return { status: 400, jsonBody: { error: "id query parameter is required" } };

      const table = getRecipesTableClient();

      let entity;
      try {
        entity = await table.getEntity("recipe", id);
      } catch {
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }

      const owner = (entity.ownerEmail || "").trim().toLowerCase();

      // Owned by someone else => block
      if (owner && owner !== userEmail) {
        return { status: 403, jsonBody: { error: "Not allowed to delete this recipe" } };
      }

      // Legacy (no owner) => allow delete
      const blobName = entity.imageBlobName || "";
      if (blobName) {
        try {
          const container = getBlobContainerClient();
          await container.getBlobClient(blobName).deleteIfExists();
        } catch (blobErr) {
          context.warn(`Blob delete failed for ${blobName}: ${blobErr?.message || blobErr}`);
        }
      }

      await table.deleteEntity("recipe", id);

      return { status: 204 };
    } catch (err) {
      const status = err?.status || 500;
      if (status !== 500) return { status, jsonBody: { error: err.message } };

      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
