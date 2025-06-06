const express = require('express');
const router = express.Router();

// Import shared utilities
const { getBaseClient, createAuthenticatedClient } = require('../utils/supabase');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responses');
const { validateRecipeData, validateRatingData, validatePagination } = require('../utils/validation');
const { 
  getRecipesWithFilters, 
  getRecipeById, 
  upsertRecipeIngredients, 
  upsertRecipeTags, 
  ensureUserProfile,
  checkResourceOwnership,
  getCurrentUser
} = require('../utils/database');
const { requireAuth } = require('./auth');

const supabase = getBaseClient();

// Get all recipes (public + user's own)
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit } = validatePagination(req.query);
  const { search, tags, difficulty, userId, publicOnly } = req.query;
  
  // Get current user if authenticated
  const currentUser = await getCurrentUser(req);
  const client = currentUser ? createAuthenticatedClient(req) : supabase;
  
  const result = await getRecipesWithFilters({
    client,
    page,
    limit,
    search,
    tags,
    difficulty,
    userId,
    publicOnly: publicOnly === 'true',
    currentUserId: currentUser?.id
  });
  
  sendSuccess(res, result);
}));

// Get user's own recipes (including private ones)
router.get('/my-recipes', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const offset = (page - 1) * limit;

    // Create a client with the user's token for RLS compliance
    const userSupabase = createAuthenticatedClient(req);

    let query = userSupabase
      .from('recipes')
      .select(`
        *,
        recipe_tags(tags(id, name, color)),
        recipe_ingredients(
          id,
          quantity,
          unit,
          notes,
          ingredients(id, name, category)
        ),
        recipe_ratings(rating)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching user recipes:', error);
      return res.status(500).json({ error: 'Failed to fetch recipes' });
    }

    // Calculate average ratings
    const recipesWithRatings = recipes.map(recipe => ({
      ...recipe,
      averageRating: recipe.recipe_ratings.length > 0 
        ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
        : 0,
      totalRatings: recipe.recipe_ratings.length
    }));

    res.json({
      recipes: recipesWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: recipes.length
      }
    });

  } catch (error) {
    console.error('Error in get user recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single recipe by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get current user if authenticated
  const currentUser = await getCurrentUser(req);
  const client = currentUser ? createAuthenticatedClient(req) : supabase;
  
  const recipe = await getRecipeById(id, client);
  
  if (!recipe) {
    return sendError(res, 'Recipe not found', 404);
  }
  
  sendSuccess(res, recipe);
}));

// Create new recipe
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      prepTime,
      cookTime,
      servings,
      difficulty,
      imageUrl,
      isPublic,
      ingredients,
      tags
    } = req.body;

    // Validation
    if (!title || !instructions) {
      return res.status(400).json({ error: 'Title and instructions are required' });
    }

    // Create a client with the user's token for RLS compliance
    const userSupabase = createAuthenticatedClient(req);

    // Ensure user profile exists in public.users table
    const { data: existingProfile } = await userSupabase
      .from('users')
      .select('id')
      .eq('id', req.user.id)
      .single();

    if (!existingProfile) {
      // Create user profile if it doesn't exist using user's token context
      const { error: profileError } = await userSupabase
        .from('users')
        .insert({
          id: req.user.id,
          email: req.user.email,
          full_name: req.user.user_metadata?.full_name || '',
          avatar_url: req.user.user_metadata?.avatar_url || null
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        return res.status(400).json({ error: 'Failed to create user profile' });
      }
    }

    // Create recipe using user's token context
    const { data: recipe, error: recipeError } = await userSupabase
      .from('recipes')
      .insert({
        user_id: req.user.id,
        title,
        description,
        instructions,
        prep_time: prepTime,
        cook_time: cookTime,
        servings,
        difficulty,
        image_url: imageUrl,
        is_public: isPublic || false
      })
      .select()
      .single();

    if (recipeError) {
      console.error('Error creating recipe:', recipeError);
      return res.status(400).json({ error: recipeError.message });
    }

    // Add ingredients using user's token context
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        // First, ensure the ingredient exists
        let { data: existingIngredient } = await userSupabase
          .from('ingredients')
          .select('id')
          .eq('name', ingredient.name)
          .single();

        if (!existingIngredient) {
          const { data: newIngredient } = await userSupabase
            .from('ingredients')
            .insert({ name: ingredient.name, category: ingredient.category })
            .select('id')
            .single();
          existingIngredient = newIngredient;
        }

        // Add to recipe_ingredients using user's token context
        await userSupabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: recipe.id,
            ingredient_id: existingIngredient.id,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes
          });
      }
    }

    // Add tags using user's token context
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await userSupabase
          .from('recipe_tags')
          .insert({
            recipe_id: recipe.id,
            tag_id: tagId
          });
      }
    }

    // Fetch the complete recipe with relations
    const { data: completeRecipe } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_tags(tags(id, name, color)),
        recipe_ingredients(
          id,
          quantity,
          unit,
          notes,
          ingredients(id, name, category)
        )
      `)
      .eq('id', recipe.id)
      .single();

    res.status(201).json({
      message: 'Recipe created successfully',
      recipe: completeRecipe
    });

  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update recipe
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      instructions,
      prepTime,
      cookTime,
      servings,
      difficulty,
      imageUrl,
      isPublic,
      ingredients,
      tags
    } = req.body;

    // Create a client with the user's token for RLS compliance
    const userSupabase = createAuthenticatedClient(req);

    // Check if user owns the recipe using user's token context
    const { data: existingRecipes, error: checkError } = await userSupabase
      .from('recipes')
      .select('user_id')
      .eq('id', id);

    if (checkError) {
      console.error('Error checking recipe ownership:', checkError);
      return res.status(500).json({ error: 'Failed to verify recipe ownership' });
    }

    if (!existingRecipes || existingRecipes.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const existingRecipe = existingRecipes[0];
    if (existingRecipe.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this recipe' });
    }

    // Update recipe using user's token context
    const { data: updatedRecipes, error: updateError } = await userSupabase
      .from('recipes')
      .update({
        title,
        description,
        instructions,
        prep_time: prepTime,
        cook_time: cookTime,
        servings,
        difficulty,
        image_url: imageUrl,
        is_public: isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (updateError) {
      console.error('Error updating recipe:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    if (!updatedRecipes || updatedRecipes.length === 0) {
      return res.status(404).json({ error: 'Recipe not found after update' });
    }

    // Update ingredients using user's token context
    if (ingredients) {
      // Delete existing ingredients
      await userSupabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      // Add new ingredients
      for (const ingredient of ingredients) {
        let { data: existingIngredients } = await userSupabase
          .from('ingredients')
          .select('id')
          .eq('name', ingredient.name);

        let existingIngredient = existingIngredients && existingIngredients.length > 0 ? existingIngredients[0] : null;

        if (!existingIngredient) {
          const { data: newIngredients } = await userSupabase
            .from('ingredients')
            .insert({ name: ingredient.name, category: ingredient.category })
            .select('id');
          existingIngredient = newIngredients && newIngredients.length > 0 ? newIngredients[0] : null;
        }

        if (existingIngredient) {
          await userSupabase
            .from('recipe_ingredients')
            .insert({
              recipe_id: id,
              ingredient_id: existingIngredient.id,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              notes: ingredient.notes
            });
        }
      }
    }

    // Update tags using user's token context
    if (tags) {
      // Delete existing tags
      await userSupabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', id);

      // Add new tags
      for (const tagId of tags) {
        await userSupabase
          .from('recipe_tags')
          .insert({
            recipe_id: id,
            tag_id: tagId
          });
      }
    }

    // Fetch the complete updated recipe using user's token context
    const { data: completeRecipes } = await userSupabase
      .from('recipes')
      .select(`
        *,
        recipe_tags(tags(id, name, color)),
        recipe_ingredients(
          id,
          quantity,
          unit,
          notes,
          ingredients(id, name, category)
        )
      `)
      .eq('id', id);

    const completeRecipe = completeRecipes && completeRecipes.length > 0 ? completeRecipes[0] : null;

    res.json({
      message: 'Recipe updated successfully',
      recipe: completeRecipe
    });

  } catch (error) {
    console.error('Error updating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Copy recipe
router.post('/:id/copy', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Create a client with the user's token for RLS compliance
    const userSupabase = createAuthenticatedClient(req);

    // Get the original recipe using user's token context
    const { data: originalRecipes, error: fetchError } = await userSupabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients(
          quantity,
          unit,
          notes,
          ingredients(name, category)
        ),
        recipe_tags(tags(id))
      `)
      .eq('id', id);

    if (fetchError) {
      console.error('Error fetching original recipe:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch recipe' });
    }

    if (!originalRecipes || originalRecipes.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    const originalRecipe = originalRecipes[0];

    // Create new recipe using user's token context
    const { data: newRecipes, error: createError } = await userSupabase
      .from('recipes')
      .insert({
        user_id: req.user.id,
        title: `${originalRecipe.title} (Copy)`,
        description: originalRecipe.description,
        instructions: originalRecipe.instructions,
        prep_time: originalRecipe.prep_time,
        cook_time: originalRecipe.cook_time,
        servings: originalRecipe.servings,
        difficulty: originalRecipe.difficulty,
        image_url: originalRecipe.image_url,
        is_public: false // Copies are private by default
      })
      .select();

    if (createError) {
      console.error('Error copying recipe:', createError);
      return res.status(400).json({ error: createError.message });
    }

    if (!newRecipes || newRecipes.length === 0) {
      return res.status(400).json({ error: 'Failed to create recipe copy' });
    }

    const newRecipe = newRecipes[0];

    // Copy ingredients using user's token context
    for (const recipeIngredient of originalRecipe.recipe_ingredients) {
      let { data: ingredients } = await userSupabase
        .from('ingredients')
        .select('id')
        .eq('name', recipeIngredient.ingredients.name);

      let ingredient = ingredients && ingredients.length > 0 ? ingredients[0] : null;

      if (!ingredient) {
        const { data: newIngredients } = await userSupabase
          .from('ingredients')
          .insert({ 
            name: recipeIngredient.ingredients.name, 
            category: recipeIngredient.ingredients.category 
          })
          .select('id');
        ingredient = newIngredients && newIngredients.length > 0 ? newIngredients[0] : null;
      }

      if (ingredient) {
        await userSupabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: newRecipe.id,
            ingredient_id: ingredient.id,
            quantity: recipeIngredient.quantity,
            unit: recipeIngredient.unit,
            notes: recipeIngredient.notes
          });
      }
    }

    // Copy tags using user's token context
    for (const recipeTag of originalRecipe.recipe_tags) {
      await userSupabase
        .from('recipe_tags')
        .insert({
          recipe_id: newRecipe.id,
          tag_id: recipeTag.tags.id
        });
    }

    res.status(201).json({
      message: 'Recipe copied successfully',
      recipe: newRecipe
    });

  } catch (error) {
    console.error('Error copying recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete recipe
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the recipe
    const { data: recipe, error: checkError } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (recipe.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this recipe' });
    }

    // Delete recipe (cascade will handle related records)
    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting recipe:', deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    res.json({ message: 'Recipe deleted successfully' });

  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rate recipe
router.post('/:id/rate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if recipe exists
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', id)
      .single();

    if (recipeError || !recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Upsert rating
    const { data, error } = await supabase
      .from('recipe_ratings')
      .upsert({
        recipe_id: id,
        user_id: req.user.id,
        rating,
        review,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error rating recipe:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Recipe rated successfully',
      rating: data
    });

  } catch (error) {
    console.error('Error rating recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
