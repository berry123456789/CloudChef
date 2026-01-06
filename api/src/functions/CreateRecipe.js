const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const crypto = require("crypto");

const TABLE_NAME = "Recipes";
const PARTITION_KEY = "recipe";

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("Missing AzureWebJobsStorage app setting");
  return TableClient.fromConnectionString(conn, TABLE_NAME);
}

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const table = getTableClient();
    await table.createTable(); // safe if already exists

    let body;
    try {
      body = await request.json();
    } catch {
      return { status: 400, jsonBody: { error: "Invalid JSON body" } };
    }

    const title = (body.title ?? "").toString().trim();
    const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
    const instructions = (body.instructions ?? "").toString().trim();

    if (!title || !instructions) {
      return {
        status: 400,
        jsonBody: { error: "title and instructions are required" },
      };
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const entity = {
      partitionKey: PARTITION_KEY,
      rowKey: id,
      title,
      // Store arrays safely as JSON in Table Storage
      ingredientsJson: JSON.stringify(ingredients),
      instructions,
      createdAt: now,
      updatedAt: now,
      imageBlobName: "", // filled by UploadRecipeImage
    };

    await table.createEntity(entity);

    return {
      status: 201,
      jsonBody: {
        id,
        title,
        ingredients,
        instructions,
        createdAt: now,
      },
    };
  },
});
