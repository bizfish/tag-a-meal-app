# Database Reset Guide

This guide explains how to reset your Tag-a-Meal database to its default state, removing all test data and restoring only the original default tags and ingredients.

## ⚠️ Important Warning

**These reset operations will permanently delete ALL user data including:**
- All user accounts
- All recipes
- All recipe ingredients and tags
- All recipe ratings and reviews
- All recipe collections
- Any custom tags and ingredients added during testing

**Only the following default data will remain:**
- 10 default tags (Vegetarian, Vegan, Gluten-Free, etc.)
- 10 default ingredients (Salt, Pepper, Olive Oil, etc.)

## Reset Methods

### Method 1: Using npm script (Recommended)

```bash
npm run reset-db
```

This method:
- Prompts for confirmation before proceeding
- Provides detailed progress feedback
- Verifies the reset was successful
- Shows final record counts

### Method 2: Using Node.js directly

```bash
node scripts/reset-database.js
```

### Method 3: Using SQL directly

If you prefer to run the SQL commands directly in your Supabase dashboard or SQL client:

```bash
# View the SQL file
cat scripts/reset-database.sql
```

Then copy and paste the SQL commands into your database client.

## What Gets Reset

### Deleted Data
- **Users table**: All user accounts
- **Recipes table**: All recipes
- **Recipe_ingredients table**: All recipe-ingredient relationships
- **Recipe_tags table**: All recipe-tag relationships
- **Recipe_ratings table**: All ratings and reviews
- **Recipe_collections table**: All user collections
- **Collection_recipes table**: All collection-recipe relationships
- **Custom tags**: Any tags beyond the default 10
- **Custom ingredients**: Any ingredients beyond the default 10

### Preserved Data
- **Default Tags** (10 total):
  - Vegetarian (#10B981)
  - Vegan (#059669)
  - Gluten-Free (#F59E0B)
  - Quick & Easy (#EF4444)
  - Healthy (#8B5CF6)
  - Comfort Food (#F97316)
  - Dessert (#EC4899)
  - Breakfast (#06B6D4)
  - Lunch (#84CC16)
  - Dinner (#6366F1)

- **Default Ingredients** (10 total):
  - Salt (Seasonings)
  - Black Pepper (Seasonings)
  - Olive Oil (Oils)
  - Garlic (Vegetables)
  - Onion (Vegetables)
  - Tomato (Vegetables)
  - Flour (Baking)
  - Sugar (Baking)
  - Eggs (Dairy)
  - Milk (Dairy)

## Prerequisites

- Node.js installed
- Valid `.env` file with Supabase credentials
- `SUPABASE_SERVICE_ROLE_KEY` must be set (not just the anon key)

## Verification

After running the reset, you'll see a summary showing the record count for each table:

```
📊 Verifying reset results:
tags: 10 records
ingredients: 10 records
recipes: 0 records
users: 0 records
recipe_ingredients: 0 records
recipe_tags: 0 records
recipe_ratings: 0 records
recipe_collections: 0 records
collection_recipes: 0 records
```

## Troubleshooting

### Permission Errors
If you get permission errors, ensure your `SUPABASE_SERVICE_ROLE_KEY` is set correctly in your `.env` file. The service role key has admin privileges needed for these operations.

### RLS (Row Level Security) Issues
The reset script uses the service role key which bypasses RLS policies. If you're still having issues, you may need to temporarily disable RLS on tables, though this should not be necessary with the service role key.

### Partial Reset
If the reset fails partway through, you can safely run it again. The script is designed to be idempotent - running it multiple times will produce the same result.

## Recovery

If you need to restore the database structure entirely (not just data), you can run:

```bash
npm run setup-db
```

This will recreate all tables, indexes, and RLS policies, then populate with default data.
