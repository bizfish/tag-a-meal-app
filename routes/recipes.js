const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get all recipes (public + user's own)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12, search, tags, difficulty, userId } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('recipes')
      .select(`
        *,
        users!recipes_user_id_fkey(full_name, avatar_url),
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      // Only show public recipes if not filtering by user
      query = query.eq('is_public', true);
    }

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error fetching recipes:', error);
      return res.status(500).json({ error: 'Failed to fetch recipes' });
    }

    // Filter by tags if specified
    let filteredRecipes = recipes;
    if (tags) {
      const tagArray = tags.split(',');
      filteredRecipes = recipes.filter(recipe => 
        recipe.recipe_tags.some(rt => 
          tagArray.includes(rt.tags.name.toLowerCase())
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

    res.json({
      recipes: recipesWithRatings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredRecipes.length
      }
    });

  } catch (error) {
    console.error('Error in get recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's own recipes (including private ones)
router.get('/my-recipes', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 12, search } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        users!recipes_user_id_fkey(full_name, avatar_url),
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
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching recipe:', error);
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Calculate average rating
    const averageRating = recipe.recipe_ratings.length > 0 
      ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
      : 0;

    res.json({
      ...recipe,
      averageRating,
      totalRatings: recipe.recipe_ratings.length
    });

  } catch (error) {
    console.error('Error in get recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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

    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
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

    // Add ingredients
    if (ingredients && ingredients.length > 0) {
      for (const ingredient of ingredients) {
        // First, ensure the ingredient exists
        let { data: existingIngredient } = await supabase
          .from('ingredients')
          .select('id')
          .eq('name', ingredient.name)
          .single();

        if (!existingIngredient) {
          const { data: newIngredient } = await supabase
            .from('ingredients')
            .insert({ name: ingredient.name, category: ingredient.category })
            .select('id')
            .single();
          existingIngredient = newIngredient;
        }

        // Add to recipe_ingredients
        await supabase
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

    // Add tags
    if (tags && tags.length > 0) {
      for (const tagId of tags) {
        await supabase
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

    // Check if user owns the recipe
    const { data: existingRecipe, error: checkError } = await supabase
      .from('recipes')
      .select('user_id')
      .eq('id', id)
      .single();

    if (checkError || !existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    if (existingRecipe.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this recipe' });
    }

    // Update recipe
    const { data: recipe, error: updateError } = await supabase
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
      .select()
      .single();

    if (updateError) {
      console.error('Error updating recipe:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // Update ingredients
    if (ingredients) {
      // Delete existing ingredients
      await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id);

      // Add new ingredients
      for (const ingredient of ingredients) {
        let { data: existingIngredient } = await supabase
          .from('ingredients')
          .select('id')
          .eq('name', ingredient.name)
          .single();

        if (!existingIngredient) {
          const { data: newIngredient } = await supabase
            .from('ingredients')
            .insert({ name: ingredient.name, category: ingredient.category })
            .select('id')
            .single();
          existingIngredient = newIngredient;
        }

        await supabase
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

    // Update tags
    if (tags) {
      // Delete existing tags
      await supabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', id);

      // Add new tags
      for (const tagId of tags) {
        await supabase
          .from('recipe_tags')
          .insert({
            recipe_id: id,
            tag_id: tagId
          });
      }
    }

    // Fetch the complete updated recipe
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
      .eq('id', id)
      .single();

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

    // Get the original recipe
    const { data: originalRecipe, error: fetchError } = await supabase
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
      .eq('id', id)
      .single();

    if (fetchError || !originalRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Create new recipe
    const { data: newRecipe, error: createError } = await supabase
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
      .select()
      .single();

    if (createError) {
      console.error('Error copying recipe:', createError);
      return res.status(400).json({ error: createError.message });
    }

    // Copy ingredients
    for (const recipeIngredient of originalRecipe.recipe_ingredients) {
      let { data: ingredient } = await supabase
        .from('ingredients')
        .select('id')
        .eq('name', recipeIngredient.ingredients.name)
        .single();

      if (!ingredient) {
        const { data: newIngredient } = await supabase
          .from('ingredients')
          .insert({ 
            name: recipeIngredient.ingredients.name, 
            category: recipeIngredient.ingredients.category 
          })
          .select('id')
          .single();
        ingredient = newIngredient;
      }

      await supabase
        .from('recipe_ingredients')
        .insert({
          recipe_id: newRecipe.id,
          ingredient_id: ingredient.id,
          quantity: recipeIngredient.quantity,
          unit: recipeIngredient.unit,
          notes: recipeIngredient.notes
        });
    }

    // Copy tags
    for (const recipeTag of originalRecipe.recipe_tags) {
      await supabase
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
