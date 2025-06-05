const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./auth');
const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Get all tags
router.get('/', async (req, res) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('tags')
      .select('*')
      .order('name')
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data: tags, error } = await query;

    if (error) {
      console.error('Error fetching tags:', error);
      return res.status(500).json({ error: 'Failed to fetch tags' });
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
    console.error('Error in get tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get popular tags (most used)
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data: popularTags, error } = await supabase
      .from('tags')
      .select(`
        *,
        recipe_tags(count)
      `)
      .order('recipe_tags.count', { ascending: false })
      .limit(parseInt(limit));

    if (error) {
      console.error('Error fetching popular tags:', error);
      return res.status(500).json({ error: 'Failed to fetch popular tags' });
    }

    // Get tag usage counts
    const tagsWithCounts = await Promise.all(
      popularTags.map(async (tag) => {
        const { count, error: countError } = await supabase
          .from('recipe_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', tag.id);

        return {
          ...tag,
          usageCount: countError ? 0 : count
        };
      })
    );

    // Sort by usage count
    tagsWithCounts.sort((a, b) => b.usageCount - a.usageCount);

    res.json({ tags: tagsWithCounts });

  } catch (error) {
    console.error('Error in get popular tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single tag by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tag, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tag:', error);
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Get usage count
    const { count, error: countError } = await supabase
      .from('recipe_tags')
      .select('*', { count: 'exact', head: true })
      .eq('tag_id', id);

    res.json({
      ...tag,
      usageCount: countError ? 0 : count
    });

  } catch (error) {
    console.error('Error in get tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new tag
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag already exists
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Tag already exists' });
    }

    // Validate color format (hex color)
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const tagColor = color && colorRegex.test(color) ? color : '#3B82F6';

    const { data: tag, error } = await supabase
      .from('tags')
      .insert({
        name: name.trim(),
        color: tagColor
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Tag created successfully',
      tag
    });

  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tag
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag exists
    const { data: existing, error: checkError } = await supabase
      .from('tags')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if name conflicts with another tag
    const { data: nameConflict } = await supabase
      .from('tags')
      .select('id')
      .eq('name', name.trim())
      .neq('id', id)
      .single();

    if (nameConflict) {
      return res.status(409).json({ error: 'A tag with this name already exists' });
    }

    // Validate color format
    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const tagColor = color && colorRegex.test(color) ? color : '#3B82F6';

    const { data: tag, error } = await supabase
      .from('tags')
      .update({
        name: name.trim(),
        color: tagColor
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tag:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      message: 'Tag updated successfully',
      tag
    });

  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete tag
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tag is used in any recipes
    const { data: usage, error: usageError } = await supabase
      .from('recipe_tags')
      .select('id')
      .eq('tag_id', id)
      .limit(1);

    if (usageError) {
      console.error('Error checking tag usage:', usageError);
      return res.status(500).json({ error: 'Failed to check tag usage' });
    }

    if (usage && usage.length > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete tag that is used in recipes',
        message: 'This tag is currently being used in one or more recipes. Please remove it from all recipes before deleting.'
      });
    }

    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting tag:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Tag deleted successfully' });

  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get tag usage statistics
router.get('/:id/usage', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: usage, error } = await supabase
      .from('recipe_tags')
      .select(`
        id,
        recipes(id, title, user_id, is_public)
      `)
      .eq('tag_id', id);

    if (error) {
      console.error('Error fetching tag usage:', error);
      return res.status(500).json({ error: 'Failed to fetch tag usage' });
    }

    // Filter out private recipes unless user owns them
    const publicUsage = usage.filter(u => u.recipes.is_public);

    res.json({
      totalUsage: usage.length,
      publicUsage: publicUsage.length,
      recipes: publicUsage.map(u => ({
        id: u.recipes.id,
        title: u.recipes.title
      }))
    });

  } catch (error) {
    console.error('Error in get tag usage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recipes by tag
router.get('/:id/recipes', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const { data: recipes, error } = await supabase
      .from('recipe_tags')
      .select(`
        recipes(
          *,
          users!recipes_user_id_fkey(full_name, avatar_url),
          recipe_tags(tags(id, name, color)),
          recipe_ratings(rating)
        )
      `)
      .eq('tag_id', id)
      .eq('recipes.is_public', true)
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching recipes by tag:', error);
      return res.status(500).json({ error: 'Failed to fetch recipes' });
    }

    // Extract and format recipes
    const formattedRecipes = recipes
      .map(r => r.recipes)
      .filter(recipe => recipe !== null)
      .map(recipe => ({
        ...recipe,
        averageRating: recipe.recipe_ratings.length > 0 
          ? recipe.recipe_ratings.reduce((sum, r) => sum + r.rating, 0) / recipe.recipe_ratings.length
          : 0,
        totalRatings: recipe.recipe_ratings.length
      }));

    res.json({
      recipes: formattedRecipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: formattedRecipes.length
      }
    });

  } catch (error) {
    console.error('Error in get recipes by tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk create tags
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const { tags } = req.body;

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      return res.status(400).json({ error: 'Tags array is required' });
    }

    const results = {
      created: [],
      existing: [],
      errors: []
    };

    const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

    for (const tag of tags) {
      try {
        if (!tag.name) {
          results.errors.push({ tag, error: 'Name is required' });
          continue;
        }

        // Check if tag already exists
        const { data: existing } = await supabase
          .from('tags')
          .select('*')
          .eq('name', tag.name.trim())
          .single();

        if (existing) {
          results.existing.push(existing);
          continue;
        }

        // Validate and set color
        const tagColor = tag.color && colorRegex.test(tag.color) ? tag.color : '#3B82F6';

        // Create new tag
        const { data: newTag, error } = await supabase
          .from('tags')
          .insert({
            name: tag.name.trim(),
            color: tagColor
          })
          .select()
          .single();

        if (error) {
          results.errors.push({ tag, error: error.message });
        } else {
          results.created.push(newTag);
        }

      } catch (error) {
        results.errors.push({ tag, error: error.message });
      }
    }

    res.status(201).json({
      message: 'Bulk tag creation completed',
      results
    });

  } catch (error) {
    console.error('Error in bulk create tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
