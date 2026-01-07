const { app } = require("@azure/functions");
const { getRecipesTableClient, getBlobContainerClient, PARTITION_KEY } = require("../shared/storage");

function blobNameFromUrl(url) {
  // expects .../recipe-media/<blobName>
  try {
    const u = new URL(url);
    return decodeURIComponent(u.pathname.split("/").pop());
  } catch {
    return null;
  }
}

app.http("DeleteRecipe", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id is required" } };

      const table = getRecipesTableClient();

      // try fetch to know if there's an image to delete
      let entity = null;
      try {
        entity = await table.getEntity(PARTITION_KEY, id);
      } catch (e) {
        if (e?.statusCode === 404) return { status: 404, jsonBody: { error: "Recipe not found" } };
        throw e;
      }

      // delete blob if any
      if (entity.imageUrl) {
        const blobName = blobNameFromUrl(entity.imageUrl);
        if (blobName) {
          const container = getBlobContainerClient();
          await container.getBlockBlobClient(blobName).deleteIfExists();
        }
      }

      await table.deleteEntity(PARTITION_KEY, id);

      return { status: 204 };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
