const { app } = require("@azure/functions");
const { getRecipesTableClient, getBlobContainerClient } = require("../shared/storage");
const { requireUser } = require("../shared/auth");

app.http("DeleteRecipe", {
  methods: ["DELETE", "POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      // Require login
      const auth = requireUser(request);
      if (!auth.ok) return { status: auth.status, jsonBody: { error: auth.error } };
      const email = auth.email;

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

      // Ownership check
      const owner = (entity.createdBy || "").toLowerCase();
      if (!owner) {
        return { status: 403, jsonBody: { error: "Recipe has no owner set (legacy data)" } };
      }
      if (owner !== email.toLowerCase()) {
        return { status: 403, jsonBody: { error: "You can only delete your own recipes" } };
      }

      // Delete blob if stored
      const blobName = entity.imageBlobName || "";
      if (blobName) {
        try {
          const container = getBlobContainerClient();
          const blobClient = container.getBlobClient(blobName);
          await blobClient.deleteIfExists();
        } catch (blobErr) {
          context.warn(`Blob delete failed for ${blobName}: ${blobErr?.message || blobErr}`);
        }
      }

      await table.deleteEntity("recipe", id);
      return { status: 204 };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
