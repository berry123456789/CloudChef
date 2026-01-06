const { TableClient } = require("@azure/data-tables");

const connectionString = process.env.AzureWebJobsStorage;
const tableName = "Recipes";

const tableClient = TableClient.fromConnectionString(
  connectionString,
  tableName
);

module.exports = tableClient;
