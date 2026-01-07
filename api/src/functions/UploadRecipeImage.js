const { app } = require("@azure/functions");
const { getRecipesTableClient, getBlobContainerClient, PARTITION_KEY, ensureStorage } = require("../shared/storage");

function getExtFromContentType(ct) {
  if (!ct) return "bin";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  return "bin";
}

app.http("UploadRecipeImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const id = request.query.get("id");
      if (!id) return { status: 400, jsonBody: { error: "id is required" } };

      await ensureStorage();

      // Confirm recipe exists
      const table = getRecipesTableClient();
      const entity = await table.getEntity(PARTITION_KEY, id);

      // Parse multipart form-data (Azure Functions v4 supports request.formData())
      const form = await request.formData();
      const file = form.get("file");
      if (!file) return { status: 400, jsonBody: { error: "file is required (form-data key: file)" } };

      // file is a Web File object
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const contentType = file.type || "application/octet-stream";
      const ext = getExtFromContentType(contentType);
      const blobName = `${id}.${ext}`;

      const container = getBlobContainerClient();
      await container.createIfNotExists();

      const blob = container.getBlockBlobClient(blobName);
      await blob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      const imageUrl = blob.url;

      // Update entity with imageUrl (keep everything else)
      const updated = {
        partitionKey: PARTITION_KEY,
        rowKey: id,
        title: entity.title,
        instructions: entity.instructions,
        ingredientsJson: entity.ingredientsJson,
        createdAt: entity.createdAt,
        imageUrl,
      };
      await table.updateEntity(updated, "Replace");

      return { status: 200, jsonBody: { id, imageUrl } };
    } catch (err) {
      const status = err?.statusCode === 404 ? 404 : 500;
      return {
        status,
        jsonBody: {
          error: status === 404 ? "Recipe not found" : "Server error",
          details: status === 500 ? String(err?.message || err) : undefined,
        },
      };
    }
  },
});
