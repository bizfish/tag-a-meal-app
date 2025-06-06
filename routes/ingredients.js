const express = require('express');
const router = express.Router();

// Import shared utilities
const { getBaseClient, createAuthenticatedClient } = require('../utils/supabase');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responses');
const { validateIngredientData, validatePagination } = require('../utils/validation');
const { getResourceUsageCount } = require('../utils/database');
const { requireAuth } = require('./auth');

const supabase = getBaseClient();

// Get all ingredients
router.get('/', asyncHandler(async (req, res) => {
  const { page, limit } = validatePagination(req.query);
  const { search, category } = req.query;
  const offset = (page - 1) * limit;

  const client = req.headers.authorization ? createAuthenticatedClient(req) : supabase;

  let query = client
    .from('ingredients')
    .select('*')
    .order('name')
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  if (category) {
    query = query.eq('category', category);
  }

  const { data: ingredients, error } = await query;

  if (error) {
    throw error;
  }

  sendSuccess(res, {
    ingredients,
    pagination: {
      page,
      limit,
      total: ingredients.length
    }
  });
}));

// Get ingredient categories
router.get('/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('ingredients')
      .select('category')
      .not('category', 'is', null)
      .order('category');

    if (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }

    // Get unique categories
    const uniqueCategories = [...new Set(categories.map(c => c.category))];

    res.json({ categories: uniqueCategories });

  } catch (error) {
    console.error('Error in get categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single ingredient by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ingredient:', error);
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json(ingredient);

  } catch (error) {
    console.error('Error in get ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new ingredient
router.post('/', requireAuth, asyncHandler(async (req, res) => {
  const validationError = validateIngredientData(req.body);
  if (validationError) {
    return sendError(res, validationError.message, validationError.statusCode);
  }

  const { name, category } = req.body;
  const client = createAuthenticatedClient(req);

  // Check if ingredient already exists
  const { data: existing } = await client
    .from('ingredients')
    .select('id')
    .eq('name', name.trim())
    .single();

  if (existing) {
    return sendError(res, 'Ingredient already exists', 409);
  }

  const { data: ingredient, error } = await client
    .from('ingredients')
    .insert({
      name: name.trim(),
      category: category?.trim() || null
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  sendSuccess(res, { ingredient }, 'Ingredient created successfully', 201);
}));

// Update ingredient
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Ingredient name is required' });
    }

    // Check if ingredient exists
    const { data: existing, error: checkError } = await supabase
      .from('ingredients')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    // Check if name conflicts with another ingredient
    const { data: nameConflict } = await supabase
      .from('ingredients')
      .select('id')
      .eq('name', name)
      .neq('id', id)
      .single();

    if (nameConflict) {
      return res.status(409).json({ error: 'An ingredient with this name already exists' });
    }

    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .update({
        name: name.trim(),
        category: category?.trim() || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Ingredient updated successfully',
      ingredient
    });

  } catch (error) {
    console.error('Error updating ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete ingredient
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ingredient is used in any recipes
    const { data: usage, error: usageError } = await supabase
      .from('recipe_ingredients')
      .select('id')
      .eq('ingredient_id', id)
      .limit(1);

    if (usageError) {
      console.error('Error checking ingredient usage:', usageError);
      return res.status(500).json({ error: 'Failed to check ingredient usage' });
    }

    if (usage && usage.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete ingredient that is used in recipes',
        message: 'This ingredient is currently being used in one or more recipes. Please remove it from all recipes before deleting.'
      });
    }

    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting ingredient:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Ingredient deleted successfully' });

  } catch (error) {
    console.error('Error deleting ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get ingredient usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: usage, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        quantity,
        unit,
        recipes(id, title, user_id, is_public)
      `)
      .eq('ingredient_id', id);

    if (error) {
      console.error('Error fetching ingredient usage:', error);
      return res.status(500).json({ error: 'Failed to fetch ingredient usage' });
    }

    // Filter out private recipes unless user owns them
    const publicUsage = usage.filter(u => u.recipes.is_public);

    res.json({
      totalUsage: usage.length,
      publicUsage: publicUsage.length,
      recipes: publicUsage.map(u => ({
        id: u.recipes.id,
        title: u.recipes.title,
        quantity: u.quantity,
        unit: u.unit
      }))
    });

  } catch (error) {
    console.error('Error in get ingredient usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk create ingredients
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients array is required' });
    }

    const results = {
      created: [],
      existing: [],
      errors: []
    };

    for (const ingredient of ingredients) {
      try {
        if (!ingredient.name) {
          results.errors.push({ ingredient, error: 'Name is required' });
          continue;
        }

        // Check if ingredient already exists
        const { data: existing } = await supabase
          .from('ingredients')
          .select('*')
          .eq('name', ingredient.name.trim())
          .single();

        if (existing) {
          results.existing.push(existing);
          continue;
        }

        // Create new ingredient
        const { data: newIngredient, error } = await supabase
          .from('ingredients')
          .insert({
            name: ingredient.name.trim(),
            category: ingredient.category?.trim() || null
          })
          .select()
          .single();

        if (error) {
          results.errors.push({ ingredient, error: error.message });
        } else {
          results.created.push(newIngredient);
        }

      } catch (error) {
        results.errors.push({ ingredient, error: error.message });
      }
    }

    res.status(201).json({
      message: 'Bulk ingredient creation completed',
      results
    });

  } catch (error) {
    console.error('Error in bulk create ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
