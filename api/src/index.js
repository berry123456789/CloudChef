const { app } = require('@azure/functions');

require('./functions/CreateRecipe');
require('./functions/GetRecipe');
require('./functions/UpdateRecipe');
require('./functions/DeleteRecipe');
require('./functions/UploadRecipeImage');
