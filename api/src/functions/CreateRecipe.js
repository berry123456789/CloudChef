const { app } = require('@azure/functions');

app.http('CreateRecipe', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const body = await request.json();

      const { title, ingredients, instructions } = body;

      if (!title || !ingredients || !instructions) {
        return {
          status: 400,
          jsonBody: {
            error: 'Missing required fields'
          }
        };
      }

      // TEMP: fake ID until DB is added
      const recipe = {
        id: crypto.randomUUID(),
        title,
        ingredients,
        instructions,
        createdAt: new Date().toISOString()
      };

      context.log('Recipe created:', recipe);

      return {
        status: 201,
        jsonBody: recipe
      };
    } catch (err) {
      context.log.error(err);
      return {
        status: 500,
        jsonBody: { error: 'Invalid JSON or server error' }
      };
    }
  }
});
