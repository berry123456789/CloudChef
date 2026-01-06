const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "Recipes";
const PARTITION_KEY = "recipe";

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("Missing AzureWebJobsStorage app setting");
  return TableClient.fromConnectionString(conn, TABLE_NAME);
}

function toRecipe(entity) {
  return {
    id: entity.rowKey,
    title: entity.title,
    ingredients: entity.ingredientsJson ? JSON.parse(entity.ingredientsJson) : [],
    instructions: entity.instructions,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    imageUrl: entity.imageUrl || null,
  };
}

app.http("GetRecipe", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const table = getTableClient();
    await table.createTable();

    const id = request.query.get("id");

    // Get single
    if (id) {
      try {
        const entity = await table.getEntity(PARTITION_KEY, id);
        return { status: 200, jsonBody: toRecipe(entity) };
      } catch (e) {
        return { status: 404, jsonBody: { error: "Recipe not found" } };
      }
    }

    // List (simple)
    const results = [];
    const iter = table.listEntities({
      queryOptions: { filter: `PartitionKey eq '${PARTITION_KEY}'` },
    });

    for await (const entity of iter) {
      results.push(toRecipe(entity));
      if (results.length >= 50) break; // prevent huge responses
    }

    return { status: 200, jsonBody: results };
  },
});
