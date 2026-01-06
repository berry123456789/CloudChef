const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");

const TABLE_NAME = "Recipes";
const PARTITION_KEY = "recipe";

function getTableClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) throw new Error("Missing AzureWebJobsStorage app setting");
  return TableClient.fromConnectionString(conn, TABLE_NAME);
}

app.http("DeleteRecipe", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    const table = getTableClient();
    await table.createTable();

    const id = request.query.get("id");
    if (!id) return { status: 400, jsonBody: { error: "Missing ?id=" } };

    try {
      await table.deleteEntity(PARTITION_KEY, id);
      return { status: 204 };
    } catch {
      return { status: 404, jsonBody: { error: "Recipe not found" } };
    }
  },
});
