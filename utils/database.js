const { getBaseClient, createAuthenticatedClient } = require('./supabase');
const { handleDatabaseError } = require('./responses');

/**
 * Standard recipe query with all relations
 */
const RECIPE_SELECT_QUERY = `
  *,
  users!recipes_user_id_fkey(full_name, avatar_url, show_author_name),
  recipe_tags(tags(id, name, color)),
  recipe_ingredients(
    id,
    quantity,
    unit,
    notes,
    ingredients(id, name, category)
  ),
  recipe_ratings(rating)
`;

/**
 * Get recipes with standard filtering and pagination
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Query result with recipes and pagination info
 */
async function getRecipesWithFilters(options = {}) {
  const {
    client = getBaseClient(),
    page = 1,
    limit = 12,
    search,
    difficulty,
    userId,
    publicOnly = false,
    currentUserId = null,
    tags,
    includeIngredients,
    excludeIngredients,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options;

  const offset = (page - 1) * limit;

  let query = client
    .from('recipes')
    .select(RECIPE_SELECT_QUERY)
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(offset, offset + limit - 1);

  // Apply visibility filters
  if (userId) {
    query = query.eq('user_id', userId);
  } else if (publicOnly) {
    query = query.eq('is_public', true);
  } else if (currentUserId) {
    query = query.or(`is_public.eq.true,user_id.eq.${currentUserId}`);
  } else {
    query = query.eq('is_public', true);
  }

  // Apply search filters
  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,instructions.ilike.%${search}%`);
  }

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data: recipes, error } = await query;

  if (error) {
    throw error;
  }

  // Apply client-side filters for complex queries
  let filteredRecipes = recipes || [];

  // Filter by ingredients
  if (includeIngredients) {
    const includeList = includeIngredients.split(',').map(i => i.trim().toLowerCase());
    filteredRecipes = filteredRecipes.filter(recipe =>
      includeList.every(searchIngredient =>
        recipe.recipe_ingredients.some(ri =>
          ri.ingredients && ri.ingredients.name && 
          ri.ingredients.name.toLowerCase().includes(searchIngredient)
        )
      )
    );
  }

  if (excludeIngredients) {
    const excludeList = excludeIngredients.split(',').map(i => i.trim().toLowerCase());
    filteredRecipes = filteredRecipes.filter(recipe =>
      !excludeList.some(searchIngredient =>
        recipe.recipe_ingredients.some(ri =>
          ri.ingredients && ri.ingredients.name && 
          ri.ingredients.name.toLowerCase().includes(searchIngredient)
        )
      )
    );
  }

  // Filter by tags
  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    filteredRecipes = filteredRecipes.filter(recipe =>
      recipe.recipe_tags.some(rt =>
        tagList.some(searchTag =>
          rt.tags.name.toLowerCase().includes(searchTag)
        )
      )
    );
  }

  // Calculate average ratings
  const recipesWithRatings = filteredRecipes.map(recipe => ({
    ...recipe,
    averageRating: recipe.recipe_ratings.length > 0 
      ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
      : 0,
    totalRatings: recipe.recipe_ratings.length
  }));

  return {
    recipes: recipesWithRatings,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: recipesWithRatings.length
    }
  };
}

/**
 * Get a single recipe by ID with all relations
 * @param {string} recipeId - Recipe ID
 * @param {Object} client - Supabase client (optional)
 * @returns {Promise<Object>} Recipe with relations
 */
async function getRecipeById(recipeId, client = getBaseClient()) {
  const { data: recipes, error } = await client
    .from('recipes')
    .select(`
      *,
      users!recipes_user_id_fkey(full_name, avatar_url, show_author_name),
      recipe_tags(tags(id, name, color)),
      recipe_ingredients(
        id,
        quantity,
        unit,
        notes,
        ingredients(id, name, category)
      ),
      recipe_ratings(
        id,
        rating,
        review,
        created_at,
        users!recipe_ratings_user_id_fkey(full_name)
      )
    `)
    .eq('id', recipeId);

  if (error) {
    throw error;
  }

  if (!recipes || recipes.length === 0) {
    return null;
  }

  const recipe = recipes[0];

  // Calculate average rating
  const averageRating = recipe.recipe_ratings.length > 0 
    ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
    : 0;

  return {
    ...recipe,
    averageRating,
    totalRatings: recipe.recipe_ratings.length
  };
}

/**
 * Create or update ingredients for a recipe
 * @param {string} recipeId - Recipe ID
 * @param {Array} ingredients - Array of ingredient objects
 * @param {Object} client - Authenticated Supabase client
 */
async function upsertRecipeIngredients(recipeId, ingredients, client) {
  if (!ingredients || ingredients.length === 0) {
    return;
  }

  // Delete existing ingredients
  await client
    .from('recipe_ingredients')
    .delete()
    .eq('recipe_id', recipeId);

  // Add new ingredients
  for (const ingredient of ingredients) {
    if (!ingredient.name) continue;

    // Find or create ingredient
    let { data: existingIngredients } = await client
      .from('ingredients')
      .select('id')
      .eq('name', ingredient.name.trim());

    let ingredientId;
    if (existingIngredients && existingIngredients.length > 0) {
      ingredientId = existingIngredients[0].id;
    } else {
      const { data: newIngredients } = await client
        .from('ingredients')
        .insert({ 
          name: ingredient.name.trim(), 
          category: ingredient.category?.trim() || null 
        })
        .select('id');
      
      if (newIngredients && newIngredients.length > 0) {
        ingredientId = newIngredients[0].id;
      }
    }

    if (ingredientId) {
      await client
        .from('recipe_ingredients')
        .insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: ingredient.quantity,
          unit: ingredient.unit?.trim() || null,
          notes: ingredient.notes?.trim() || null
        });
    }
  }
}

/**
 * Create or update tags for a recipe
 * @param {string} recipeId - Recipe ID
 * @param {Array} tagIds - Array of tag IDs
 * @param {Object} client - Authenticated Supabase client
 */
async function upsertRecipeTags(recipeId, tagIds, client) {
  if (!tagIds || tagIds.length === 0) {
    return;
  }

  // Delete existing tags
  await client
    .from('recipe_tags')
    .delete()
    .eq('recipe_id', recipeId);

  // Add new tags
  for (const tagId of tagIds) {
    await client
      .from('recipe_tags')
      .insert({
        recipe_id: recipeId,
        tag_id: tagId
      });
  }
}

/**
 * Ensure user profile exists in the database
 * @param {Object} user - User object from auth
 * @param {Object} client - Authenticated Supabase client
 */
async function ensureUserProfile(user, client) {
  const { data: existingProfile } = await client
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingProfile) {
    const { error: profileError } = await client
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null
      });

    if (profileError) {
      throw profileError;
    }
  }
}

/**
 * Check if user owns a resource
 * @param {string} resourceId - Resource ID
 * @param {string} userId - User ID
 * @param {string} tableName - Table name
 * @param {Object} client - Supabase client
 * @returns {Promise<boolean>} True if user owns the resource
 */
async function checkResourceOwnership(resourceId, userId, tableName, client) {
  const { data, error } = await client
    .from(tableName)
    .select('user_id')
    .eq('id', resourceId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === userId;
}

/**
 * Get resource usage count
 * @param {string} resourceId - Resource ID
 * @param {string} tableName - Table name to check usage in
 * @param {string} columnName - Column name that references the resource
 * @param {Object} client - Supabase client
 * @returns {Promise<number>} Usage count
 */
async function getResourceUsageCount(resourceId, tableName, columnName, client = getBaseClient()) {
  const { count, error } = await client
    .from(tableName)
    .select('*', { count: 'exact', head: true })
    .eq(columnName, resourceId);

  if (error) {
    throw error;
  }

  return count || 0;
}

/**
 * Get current user from request token
 * @param {Object} req - Express request object
 * @returns {Promise<Object|null>} User object or null
 */
async function getCurrentUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return null;
  }

  try {
    const client = getBaseClient();
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) {
      return null;
    }
    return user;
  } catch (error) {
    return null;
  }
}

module.exports = {
  RECIPE_SELECT_QUERY,
  getRecipesWithFilters,
  getRecipeById,
  upsertRecipeIngredients,
  upsertRecipeTags,
  ensureUserProfile,
  checkResourceOwnership,
  getResourceUsageCount,
  getCurrentUser
};
