// api/src/shared/storage.js
const { TableClient } = require("@azure/data-tables");
const { BlobServiceClient } = require("@azure/storage-blob");

const RECIPES_TABLE = "Recipes";
const USERS_TABLE = "Users";
const BLOB_CONTAINER = "recipe-media";

function getConnectionString() {
  // Azure Functions uses this in production
  const cs =
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
    process.env.AzureWebJobsStorage;

  if (!cs) {
    throw new Error("Missing AZURE_STORAGE_CONNECTION_STRING / AzureWebJobsStorage");
  }
  return cs;
}

function getRecipesTableClient() {
  return TableClient.fromConnectionString(getConnectionString(), RECIPES_TABLE);
}

function getUsersTableClient() {
  return TableClient.fromConnectionString(getConnectionString(), USERS_TABLE);
}

function getBlobContainerClient() {
  const blobService = BlobServiceClient.fromConnectionString(getConnectionString());
  return blobService.getContainerClient(BLOB_CONTAINER);
}

module.exports = {
  RECIPES_TABLE,
  USERS_TABLE,
  BLOB_CONTAINER,
  getRecipesTableClient,
  getUsersTableClient,
  getBlobContainerClient,
};
