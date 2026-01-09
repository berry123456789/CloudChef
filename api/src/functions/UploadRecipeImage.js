const { app } = require("@azure/functions");
const crypto = require("crypto");
const {
  getBlobContainerClient,
  getRecipesTableClient,
  TABLE_NAME,
  BLOB_CONTAINER,
} = require("../shared/storage");

function extFromMime(mime = "") {
  const ct = String(mime).toLowerCase();
  if (ct.includes("image/jpeg")) return "jpg";
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/webp")) return "webp";
  if (ct.includes("image/gif")) return "gif";
  return "bin";
}

app.http("UploadRecipeImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const url = new URL(request.url);

      const id = (url.searchParams.get("id") || "").trim();
      if (!id) {
        return { status: 400, jsonBody: { error: "id query parameter is required" } };
      }

      const contentType = (request.headers.get("content-type") || "").toLowerCase();

      let buffer;
      let finalContentType = "application/octet-stream";

      // ✅ Handle multipart/form-data (your frontend uses this)
      if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const file = form.get("file");

        if (!file) {
          return { status: 400, jsonBody: { error: "Missing 'file' in form-data" } };
        }

        // file is a Web File/Blob in Node runtime
        finalContentType = file.type || "application/octet-stream";
        const ab = await file.arrayBuffer();
        buffer = Buffer.from(ab);
      }
      // ✅ Handle JSON base64 fallback (keeps your previous support)
      else if (contentType.includes("application/json")) {
        const body = await request.json();
        const base64 = (body.base64 || "").trim();
        if (!base64) return { status: 400, jsonBody: { error: "base64 is required in JSON body" } };
        finalContentType = (body.contentType || "application/octet-stream").trim();
        buffer = Buffer.from(base64, "base64");
      }
      // ✅ Handle raw binary body fallback
      else {
        finalContentType = request.headers.get("content-type") || "application/octet-stream";
        const ab = await request.arrayBuffer();
        buffer = Buffer.from(ab);
      }

      if (!buffer || buffer.length === 0) {
        return { status: 400, jsonBody: { error: "No image data received" } };
      }

      const ext = extFromMime(finalContentType);
      const blobName = `recipes/${id}/image-${crypto.randomUUID()}.${ext}`;

      const container = getBlobContainerClient();
      await container.createIfNotExists();

      const blockBlob = container.getBlockBlobClient(blobName);
      await blockBlob.uploadData(buffer, {
        blobHTTPHeaders: { blobContentType: finalContentType || "application/octet-stream" },
      });

      const imageUrl = blockBlob.url;

      const table = getRecipesTableClient();
      await table.updateEntity(
        {
          partitionKey: "recipe",
          rowKey: id,
          imageBlobName: blobName,
          imageUrl,
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
          contentType: finalContentType,
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
