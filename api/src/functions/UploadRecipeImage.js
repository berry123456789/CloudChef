const { app } = require("@azure/functions");
const { getBlobContainerClient, getRecipesTableClient } = require("../shared/storage");

app.http("UploadRecipeImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id query param is required" } };

      const contentType = request.headers.get("content-type") || "";

      // Expect raw binary upload in Postman using Body -> binary
      const buffer = Buffer.from(await request.arrayBuffer());
      if (!buffer.length) return { status: 400, jsonBody: { error: "No file received" } };

      // basic extension guess
      let ext = "bin";
      if (contentType.includes("png")) ext = "png";
      else if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
      else if (contentType.includes("webp")) ext = "webp";

      const container = getBlobContainerClient();
      await container.createIfNotExists({ access: "blob" }); // makes blob public-read

      const blobName = `recipes/${id}.${ext}`;
      const blobClient = container.getBlockBlobClient(blobName);

      await blobClient.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType || "application/octet-stream" },
      });

      const imageUrl = blobClient.url;

      // Save imageUrl back to the recipe entity
      const table = getRecipesTableClient();
      await table.updateEntity(
        { partitionKey: "recipe", rowKey: id, imageUrl },
        "Merge"
      );

      return { status: 200, jsonBody: { id, imageUrl } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: "Server error", details: String(err?.message || err) } };
    }
  },
});
