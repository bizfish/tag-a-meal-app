const validator = require('validator');

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object|null} Validation error or null if valid
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { message: 'Email is required', statusCode: 400 };
  }
  
  if (!validator.isEmail(email)) {
    return { message: 'Invalid email format', statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @param {number} minLength - Minimum password length (default: 6)
 * @returns {Object|null} Validation error or null if valid
 */
function validatePassword(password, minLength = 6) {
  if (!password || typeof password !== 'string') {
    return { message: 'Password is required', statusCode: 400 };
  }
  
  if (password.length < minLength) {
    return { message: `Password must be at least ${minLength} characters long`, statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate recipe data
 * @param {Object} recipeData - Recipe data to validate
 * @returns {Object|null} Validation error or null if valid
 */
function validateRecipeData(recipeData) {
  const { title, instructions } = recipeData;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return { message: 'Recipe title is required', statusCode: 400 };
  }
  
  if (!instructions || typeof instructions !== 'string' || instructions.trim() === '') {
    return { message: 'Recipe instructions are required', statusCode: 400 };
  }
  
  // Validate numeric fields if provided
  const numericFields = ['prepTime', 'cookTime', 'servings'];
  for (const field of numericFields) {
    if (recipeData[field] !== undefined && recipeData[field] !== null) {
      const value = parseInt(recipeData[field]);
      if (isNaN(value) || value < 0) {
        return { message: `${field} must be a positive number`, statusCode: 400 };
      }
    }
  }
  
  // Validate difficulty level
  if (recipeData.difficulty && !['easy', 'medium', 'hard'].includes(recipeData.difficulty)) {
    return { message: 'Difficulty must be easy, medium, or hard', statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate ingredient data
 * @param {Object} ingredientData - Ingredient data to validate
 * @returns {Object|null} Validation error or null if valid
 */
function validateIngredientData(ingredientData) {
  const { name } = ingredientData;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { message: 'Ingredient name is required', statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate tag data
 * @param {Object} tagData - Tag data to validate
 * @returns {Object|null} Validation error or null if valid
 */
function validateTagData(tagData) {
  const { name, color } = tagData;
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return { message: 'Tag name is required', statusCode: 400 };
  }
  
  // Validate color format if provided
  if (color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
    return { message: 'Color must be a valid hex color code', statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate rating data
 * @param {Object} ratingData - Rating data to validate
 * @returns {Object|null} Validation error or null if valid
 */
function validateRatingData(ratingData) {
  const { rating } = ratingData;
  
  if (!rating || typeof rating !== 'number') {
    return { message: 'Rating is required and must be a number', statusCode: 400 };
  }
  
  if (rating < 1 || rating > 5) {
    return { message: 'Rating must be between 1 and 5', statusCode: 400 };
  }
  
  return null;
}

/**
 * Validate pagination parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated pagination parameters
 */
function validatePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Sanitize string input
 * @param {string} input - String to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
function sanitizeString(input, maxLength = 1000) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input.trim().substring(0, maxLength);
}

/**
 * Validate file upload
 * @param {Object} file - Multer file object
 * @param {Array} allowedTypes - Array of allowed MIME types
 * @param {number} maxSize - Maximum file size in bytes
 * @returns {Object|null} Validation error or null if valid
 */
function validateFileUpload(file, allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'], maxSize = 5 * 1024 * 1024) {
  if (!file) {
    return { message: 'No file provided', statusCode: 400 };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { message: 'Invalid file type. Only images are allowed.', statusCode: 400 };
  }
  
  if (file.size > maxSize) {
    return { message: 'File size exceeds maximum allowed limit', statusCode: 413 };
  }
  
  return null;
}

/**
 * Validate search parameters
 * @param {Object} query - Query parameters
 * @returns {Object} Validated search parameters
 */
function validateSearchParams(query) {
  const validSortFields = ['created_at', 'updated_at', 'title', 'prep_time', 'cook_time', 'servings', 'difficulty'];
  const validSortOrders = ['asc', 'desc'];
  
  return {
    q: sanitizeString(query.q, 100),
    sortBy: validSortFields.includes(query.sortBy) ? query.sortBy : 'created_at',
    sortOrder: validSortOrders.includes(query.sortOrder?.toLowerCase()) ? query.sortOrder.toLowerCase() : 'desc',
    difficulty: ['easy', 'medium', 'hard'].includes(query.difficulty) ? query.difficulty : null
  };
}

module.exports = {
  validateEmail,
  validatePassword,
  validateRecipeData,
  validateIngredientData,
  validateTagData,
  validateRatingData,
  validatePagination,
  validateFileUpload,
  validateSearchParams,
  sanitizeString
};
