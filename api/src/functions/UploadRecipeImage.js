const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} = require("@azure/storage-blob");

const TABLE_NAME = "Recipes";
const PARTITION_KEY = "recipe";
const CONTAINER_NAME = "recipe-media";

function getConnString() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("Missing AzureWebJobsStorage app setting");
  return conn;
}

function parseConnString(conn) {
  const parts = Object.fromEntries(
    conn.split(";").map((kv) => {
      const i = kv.indexOf("=");
      return i > 0 ? [kv.slice(0, i), kv.slice(i + 1)] : [kv, ""];
    })
  );
  return { accountName: parts.AccountName, accountKey: parts.AccountKey };
}

function getTableClient() {
  return TableClient.fromConnectionString(getConnString(), TABLE_NAME);
}

function getBlobServiceClient() {
  return BlobServiceClient.fromConnectionString(getConnString());
}

function makeReadSasUrl(blobName) {
  const conn = getConnString();
  const { accountName, accountKey } = parseConnString(conn);
  const cred = new StorageSharedKeyCredential(accountName, accountKey);

  const startsOn = new Date(Date.now() - 5 * 60 * 1000);
  const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions: BlobSASPermissions.parse("r"),
      startsOn,
      expiresOn,
    },
    cred
  ).toString();

  return `https://${accountName}.blob.core.windows.net/${CONTAINER_NAME}/${blobName}?${sas}`;
}

app.http("UploadRecipeImage", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const id = request.query.get("id");
    if (!id) return { status: 400, jsonBody: { error: "Missing ?id=" } };

    const contentType = request.headers.get("content-type") || "application/octet-stream";

    const table = getTableClient();
    await table.createTable();

    // Ensure recipe exists
    let entity;
    try {
      entity = await table.getEntity(PARTITION_KEY, id);
    } catch {
      return { status: 404, jsonBody: { error: "Recipe not found" } };
    }

    const blobService = getBlobServiceClient();
    const container = blobService.getContainerClient(CONTAINER_NAME);
    await container.createIfNotExists();

    const ext =
      contentType.includes("png") ? "png" :
      contentType.includes("jpeg") ? "jpg" :
      contentType.includes("jpg") ? "jpg" : "bin";

    const blobName = `${id}.${ext}`;
    const blob = container.getBlockBlobClient(blobName);

    const data = Buffer.from(await request.arrayBuffer());
    if (!data.length) return { status: 400, jsonBody: { error: "Empty body" } };

    await blob.uploadData(data, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    const imageUrl = makeReadSasUrl(blobName);

    // Update recipe with blob reference + sas url
    entity.imageBlobName = blobName;
    entity.imageUrl = imageUrl;
    entity.updatedAt = new Date().toISOString();
    await table.updateEntity(entity, "Merge");

    return {
      status: 200,
      jsonBody: { id, blobName, imageUrl },
    };
  },
});
