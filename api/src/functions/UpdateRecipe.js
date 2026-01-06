const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "Recipes";
const PARTITION_KEY = "recipe";

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("Missing AzureWebJobsStorage app setting");
  return TableClient.fromConnectionString(conn, TABLE_NAME);
}

app.http("UpdateRecipe", {
  methods: ["PUT", "PATCH"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const table = getTableClient();
    await table.createTable();

    const id = request.query.get("id");
    if (!id) return { status: 400, jsonBody: { error: "Missing ?id=" } };

    let patch;
    try {
      patch = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body" } };
    }

    // Ensure it exists first
    let existing;
    try {
      existing = await table.getEntity(PARTITION_KEY, id);
    } catch {
      return { status: 404, jsonBody: { error: "Recipe not found" } };
    }

    const updatedAt = new Date().toISOString();

    const updatedEntity = {
      partitionKey: PARTITION_KEY,
      rowKey: id,
      title: patch.title !== undefined ? String(patch.title).trim() : existing.title,
      instructions:
        patch.instructions !== undefined
          ? String(patch.instructions).trim()
          : existing.instructions,
      ingredientsJson:
        patch.ingredients !== undefined
          ? JSON.stringify(Array.isArray(patch.ingredients) ? patch.ingredients : [])
          : existing.ingredientsJson,
      createdAt: existing.createdAt,
      updatedAt,
      imageBlobName: existing.imageBlobName || "",
      imageUrl: existing.imageUrl || "",
    };

    await table.updateEntity(updatedEntity, "Replace");

    return { status: 200, jsonBody: { id, updatedAt } };
  },
});
