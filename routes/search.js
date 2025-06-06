const express = require('express');
const router = express.Router();

// Import shared utilities
const { getBaseClient, createAuthenticatedClient } = require('../utils/supabase');
const { sendSuccess, sendError, handleDatabaseError, asyncHandler } = require('../utils/responses');

const supabase = getBaseClient();

// Unit conversion utilities
const unitConversions = {
  // Volume conversions (to milliliters)
  volume: {
    'ml': 1,
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'tsp': 4.92892,
    'teaspoon': 4.92892,
    'teaspoons': 4.92892,
    'tbsp': 14.7868,
    'tablespoon': 14.7868,
    'tablespoons': 14.7868,
    'cup': 236.588,
    'cups': 236.588,
    'fl oz': 29.5735,
    'fluid ounce': 29.5735,
    'fluid ounces': 29.5735,
    'pint': 473.176,
    'pints': 473.176,
    'quart': 946.353,
    'quarts': 946.353,
    'gallon': 3785.41,
    'gallons': 3785.41
  },
  // Weight conversions (to grams)
  weight: {
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
    'lb': 453.592,
    'pound': 453.592,
    'pounds': 453.592
  }
};

// Helper function to convert units
function convertUnit(quantity, fromUnit, toUnit) {
  if (!quantity || !fromUnit || !toUnit) return null;
  
  fromUnit = fromUnit.toLowerCase();
  toUnit = toUnit.toLowerCase();
  
  // Check if both units are in the same category
  let conversionTable = null;
  if (unitConversions.volume[fromUnit] && unitConversions.volume[toUnit]) {
    conversionTable = unitConversions.volume;
  } else if (unitConversions.weight[fromUnit] && unitConversions.weight[toUnit]) {
    conversionTable = unitConversions.weight;
  } else {
    return null; // Cannot convert between different unit types
  }
  
  // Convert to base unit, then to target unit
  const baseValue = quantity * conversionTable[fromUnit];
  const convertedValue = baseValue / conversionTable[toUnit];
  
  return Math.round(convertedValue * 1000) / 1000; // Round to 3 decimal places
}

// Advanced recipe search
router.get('/recipes', async (req, res) => {
  try {
    const {
      q, // general search query
      title,
      description,
      ingredients,
      tags,
      difficulty,
      prepTime,
      cookTime,
      servings,
      rating,
      author,
      page = 1,
      limit = 12,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Use authenticated client if token is provided
    let client = supabase;
    if (req.headers.authorization) {
      client = createAuthenticatedClient(req);
    }

    // Build the base query - include user's private recipes if authenticated
    let query = client
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
        recipe_ratings(rating)
      `);

    // If not authenticated, only show public recipes
    if (!req.headers.authorization) {
      query = query.eq('is_public', true);
    }

    // Apply filters
    if (q) {
      // Full-text search across title, description, and instructions
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,instructions.ilike.%${q}%`);
    }

    if (title) {
      query = query.ilike('title', `%${title}%`);
    }

    if (description) {
      query = query.ilike('description', `%${description}%`);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (prepTime) {
      const [operator, value] = prepTime.includes(':') ? prepTime.split(':') : ['lte', prepTime];
      query = query[operator]('prep_time', parseInt(value));
    }

    if (cookTime) {
      const [operator, value] = cookTime.includes(':') ? cookTime.split(':') : ['lte', cookTime];
      query = query[operator]('cook_time', parseInt(value));
    }

    if (servings) {
      const [operator, value] = servings.includes(':') ? servings.split(':') : ['eq', servings];
      query = query[operator]('servings', parseInt(value));
    }

    if (author) {
      query = query.ilike('users.full_name', `%${author}%`);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'title', 'prep_time', 'cook_time', 'servings'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder.toLowerCase() === 'asc' ? { ascending: true } : { ascending: false };
    
    query = query.order(sortField, order);

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: recipes, error } = await query;

    if (error) {
      console.error('Error searching recipes:', error);
      return res.status(500).json({ error: 'Failed to search recipes' });
    }

    let filteredRecipes = recipes || [];

    // Filter by ingredients if specified
    if (ingredients) {
      const ingredientList = ingredients.split(',').map(i => i.trim().toLowerCase());
      filteredRecipes = filteredRecipes.filter(recipe =>
        recipe.recipe_ingredients.some(ri =>
          ingredientList.some(searchIngredient =>
            ri.ingredients.name.toLowerCase().includes(searchIngredient)
          )
        )
      );
    }

    // Filter by include ingredients (must have ALL specified ingredients)
    if (req.query.includeIngredients) {
      const includeList = req.query.includeIngredients.split(',').map(i => i.trim().toLowerCase());
      filteredRecipes = filteredRecipes.filter(recipe =>
        includeList.every(searchIngredient =>
          recipe.recipe_ingredients.some(ri =>
            ri.ingredients && ri.ingredients.name && ri.ingredients.name.toLowerCase().includes(searchIngredient)
          )
        )
      );
    }

    // Filter by exclude ingredients (must NOT have ANY specified ingredients)
    if (req.query.excludeIngredients) {
      const excludeList = req.query.excludeIngredients.split(',').map(i => i.trim().toLowerCase());
      filteredRecipes = filteredRecipes.filter(recipe =>
        !excludeList.some(searchIngredient =>
          recipe.recipe_ingredients.some(ri =>
            ri.ingredients && ri.ingredients.name && ri.ingredients.name.toLowerCase().includes(searchIngredient)
          )
        )
      );
    }

    // Filter by tags if specified
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

    // Calculate average ratings and filter by rating if specified
    const recipesWithRatings = filteredRecipes.map(recipe => {
      const avgRating = recipe.recipe_ratings.length > 0
        ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
        : 0;
      
      return {
        ...recipe,
        averageRating: avgRating,
        totalRatings: recipe.recipe_ratings.length
      };
    });

    // Filter by rating if specified
    let finalRecipes = recipesWithRatings;
    if (rating) {
      const [operator, value] = rating.includes(':') ? rating.split(':') : ['gte', rating];
      const ratingValue = parseFloat(value);
      
      finalRecipes = recipesWithRatings.filter(recipe => {
        switch (operator) {
          case 'gte': return recipe.averageRating >= ratingValue;
          case 'lte': return recipe.averageRating <= ratingValue;
          case 'eq': return Math.abs(recipe.averageRating - ratingValue) < 0.1;
          case 'gt': return recipe.averageRating > ratingValue;
          case 'lt': return recipe.averageRating < ratingValue;
          default: return recipe.averageRating >= ratingValue;
        }
      });
    }

    res.json({
      recipes: finalRecipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: finalRecipes.length
      },
      filters: {
        q, title, description, ingredients, tags, difficulty,
        prepTime, cookTime, servings, rating, author
      },
      sorting: {
        sortBy: sortField,
        sortOrder
      }
    });

  } catch (error) {
    console.error('Error in recipe search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search ingredients
router.get('/ingredients', async (req, res) => {
  try {
    const { q, category, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('ingredients')
      .select('*')
      .order('name')
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data: ingredients, error } = await query;

    if (error) {
      console.error('Error searching ingredients:', error);
      return res.status(500).json({ error: 'Failed to search ingredients' });
    }

    res.json({
      ingredients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: ingredients.length
      }
    });

  } catch (error) {
    console.error('Error in ingredient search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search tags
router.get('/tags', async (req, res) => {
  try {
    const { q, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tags')
      .select('*')
      .order('name')
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike('name', `%${q}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error('Error searching tags:', error);
      return res.status(500).json({ error: 'Failed to search tags' });
    }

    res.json({
      tags,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tags.length
      }
    });

  } catch (error) {
    console.error('Error in tag search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Global search (recipes, ingredients, tags)
router.get('/global', async (req, res) => {
  try {
    const { q, limit = 50 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Use authenticated client if token is provided
    let client = supabase;
    if (req.headers.authorization) {
      client = createAuthenticatedClient(req);
    }

    // Build recipe search query
    let recipeQuery = client
      .from('recipes')
      .select(`
        id, title, description, image_url,
        users!recipes_user_id_fkey(full_name)
      `)
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,instructions.ilike.%${q}%`)
      .limit(parseInt(limit));

    // If not authenticated, only show public recipes
    if (!req.headers.authorization) {
      recipeQuery = recipeQuery.eq('is_public', true);
    }

    const { data: recipes } = await recipeQuery;

    // Search ingredients
    const { data: ingredients } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .ilike('name', `%${q}%`)
      .limit(parseInt(limit));

    // Search tags
    const { data: tags } = await supabase
      .from('tags')
      .select('id, name, color')
      .ilike('name', `%${q}%`)
      .limit(parseInt(limit));

    res.json({
      query: q,
      results: {
        recipes: recipes || [],
        ingredients: ingredients || [],
        tags: tags || []
      },
      totalResults: (recipes?.length || 0) + (ingredients?.length || 0) + (tags?.length || 0)
    });

  } catch (error) {
    console.error('Error in global search:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unit conversion endpoint
router.post('/convert-units', (req, res) => {
  try {
    const { quantity, fromUnit, toUnit } = req.body;

    if (!quantity || !fromUnit || !toUnit) {
      return res.status(400).json({ 
        error: 'Quantity, fromUnit, and toUnit are required' 
      });
    }

    const convertedQuantity = convertUnit(parseFloat(quantity), fromUnit, toUnit);

    if (convertedQuantity === null) {
      return res.status(400).json({ 
        error: 'Cannot convert between these unit types',
        message: 'Units must be of the same type (volume or weight)'
      });
    }

    res.json({
      originalQuantity: parseFloat(quantity),
      originalUnit: fromUnit,
      convertedQuantity,
      convertedUnit: toUnit,
      conversion: `${quantity} ${fromUnit} = ${convertedQuantity} ${toUnit}`
    });

  } catch (error) {
    console.error('Error in unit conversion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available units for conversion
router.get('/units', (req, res) => {
  try {
    res.json({
      volume: Object.keys(unitConversions.volume),
      weight: Object.keys(unitConversions.weight)
    });
  } catch (error) {
    console.error('Error getting units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recipe suggestions based on available ingredients
router.post('/suggest-recipes', async (req, res) => {
  try {
    const { ingredients, limit = 50 } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ error: 'Ingredients array is required' });
    }

    // Get recipes that contain any of the specified ingredients
    const { data: recipeIngredients, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        recipe_id,
        recipes!inner(
          id, title, description, image_url, difficulty, prep_time, cook_time,
          users!recipes_user_id_fkey(full_name),
          recipe_ratings(rating)
        ),
        ingredients!inner(name)
      `)
      .in('ingredients.name', ingredients)
      .eq('recipes.is_public', true);

    if (error) {
      console.error('Error getting recipe suggestions:', error);
      return res.status(500).json({ error: 'Failed to get recipe suggestions' });
    }

    // Group by recipe and calculate match score
    const recipeMap = new Map();
    
    recipeIngredients.forEach(ri => {
      const recipe = ri.recipes;
      if (!recipeMap.has(recipe.id)) {
        recipeMap.set(recipe.id, {
          ...recipe,
          matchedIngredients: [],
          matchScore: 0
        });
      }
      
      const recipeData = recipeMap.get(recipe.id);
      recipeData.matchedIngredients.push(ri.ingredients.name);
      recipeData.matchScore = recipeData.matchedIngredients.length;
    });

    // Convert to array and sort by match score
    const suggestedRecipes = Array.from(recipeMap.values())
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, parseInt(limit))
      .map(recipe => ({
        ...recipe,
        averageRating: recipe.recipe_ratings.length > 0
          ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
          : 0,
        totalRatings: recipe.recipe_ratings.length
      }));

    res.json({
      searchIngredients: ingredients,
      suggestedRecipes,
      totalSuggestions: suggestedRecipes.length
    });

  } catch (error) {
    console.error('Error in recipe suggestions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
