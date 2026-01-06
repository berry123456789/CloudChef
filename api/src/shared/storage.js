const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const TABLE_NAME = "Recipes";
const BLOB_CONTAINER = "recipe-media";

function getConnectionString() {
  const cs = process.env.AzureWebJobsStorage;
  if (!cs) throw new Error("Missing AzureWebJobsStorage setting.");
  return cs;
}

function getRecipesTableClient() {
  return TableClient.fromConnectionString(getConnectionString(), TABLE_NAME);
}

function getBlobContainerClient() {
  const blobService = BlobServiceClient.fromConnectionString(getConnectionString());
  return blobService.getContainerClient(BLOB_CONTAINER);
}

module.exports = {
  TABLE_NAME,
  BLOB_CONTAINER,
  getRecipesTableClient,
  getBlobContainerClient,
};
