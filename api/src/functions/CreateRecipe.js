const { app } = require("@azure/functions");
const { randomUUID } = require("crypto");
const tableClient = require("../storage/tableClient");

app.http("CreateRecipe", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    try {
      const body = await request.json();

      const { title, ingredients, instructions } = body;

      // Validation
      if (
        !title ||
        !Array.isArray(ingredients) ||
        ingredients.length === 0 ||
        !instructions
      ) {
        return {
          status: 400,
          jsonBody: {
            error: "Invalid request body"
          }
        };
      }

      const id = randomUUID();
      const createdAt = new Date().toISOString();

      const entity = {
        partitionKey: "RECIPE",
        rowKey: id,
        title,
        ingredients: JSON.stringify(ingredients),
        instructions,
        createdAt
      };

      await tableClient.createEntity(entity);

      return {
        status: 201,
        jsonBody: {
          id,
          title,
          ingredients,
          instructions,
          createdAt
        }
      };
    } catch (err) {
      context.log.error(err);
      return {
        status: 500,
        jsonBody: { error: "Failed to create recipe" }
      };
    }
  }
});
