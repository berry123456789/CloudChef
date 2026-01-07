const { app } = require("@azure/functions");
const crypto = require("crypto");
const path = require("path");
const {
  getBlobContainerClient,
  getRecipesTableClient,
  TABLE_NAME,
  BLOB_CONTAINER,
} = require("../shared/storage");

function guessExtFromContentType(contentType = "") {
  const ct = contentType.toLowerCase();
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/gif")) return ".gif";
  return "";
}

app.http("UploadRecipeImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);

      // recipe id in query string
      const id = (url.searchParams.get("id") || "").trim();
      if (!id) {
        return { status: 400, jsonBody: { error: "id query parameter is required" } };
      }

      const contentType = (request.headers.get("content-type") || "").trim();

      // Accept either:
      // 1) binary body (recommended)
      // 2) JSON body: { "base64": "...", "contentType": "image/png" }
      let buffer;
      let finalContentType = contentType;

      if (contentType.toLowerCase().includes("application/json")) {
        const body = await request.json();
        const base64 = (body.base64 || "").trim();
        if (!base64) return { status: 400, jsonBody: { error: "base64 is required in JSON body" } };
        finalContentType = (body.contentType || "application/octet-stream").trim();
        buffer = Buffer.from(base64, "base64");
      } else {
        const ab = await request.arrayBuffer();
        buffer = Buffer.from(ab);
      }

      if (!buffer || buffer.length === 0) {
        return { status: 400, jsonBody: { error: "No image data received" } };
      }

      // Create blob name
      const ext = guessExtFromContentType(finalContentType) || ".bin";
      const fileName = `image-${crypto.randomUUID()}${ext}`;
      const blobName = `recipes/${id}/${fileName}`;

      // Upload to blob
      const container = getBlobContainerClient();
      await container.createIfNotExists(); // safe if it already exists

      const blockBlob = container.getBlockBlobClient(blobName);
      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: finalContentType || "application/octet-stream" },
      });

      // This is the plain blob URL (works if container is public).
      // If your container is private, this URL won't be directly viewable without SAS.
      const imageUrl = blockBlob.url;

      // Update entity in Table Storage
      const table = getRecipesTableClient();

      // We store both blobName and imageUrl (url is handy for later)
      await table.updateEntity(
        {
          partitionKey: "recipe",
          rowKey: id,
          imageBlobName: blobName,
          imageUrl: imageUrl,
          imageUpdatedAt: new Date().toISOString(),
        },
        "Merge"
      );

      return {
        status: 200,
        jsonBody: {
          id,
          table: TABLE_NAME,
          container: BLOB_CONTAINER,
          imageBlobName: blobName,
          imageUrl,
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
