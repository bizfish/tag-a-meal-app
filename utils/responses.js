/**
 * Standard success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function sendSuccess(res, data, message = 'Success', statusCode = 200) {
  const response = { message };
  
  if (data !== null && data !== undefined) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(response, data);
    } else {
      response.data = data;
    }
  }
  
  res.status(statusCode).json(response);
}

/**
 * Standard error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {Object} details - Additional error details
 */
function sendError(res, message, statusCode = 500, details = null) {
  const response = { error: message };
  
  if (details && process.env.NODE_ENV !== 'production') {
    response.details = details;
  }
  
  res.status(statusCode).json(response);
}

/**
 * Handle database errors with appropriate HTTP status codes
 * @param {Object} res - Express response object
 * @param {Object} error - Database error object
 * @param {string} operation - Operation being performed (for logging)
 */
function handleDatabaseError(res, error, operation = 'database operation') {
  console.error(`Database error during ${operation}:`, error);
  
  // Handle specific Supabase/PostgreSQL errors
  if (error.code === '23505') { // Unique constraint violation
    return sendError(res, 'Resource already exists', 409);
  }
  
  if (error.code === '23503') { // Foreign key constraint violation
    return sendError(res, 'Referenced resource not found', 400);
  }
  
  if (error.code === '42501') { // Insufficient privilege
    return sendError(res, 'Access denied', 403);
  }
  
  // Handle Supabase Auth errors
  if (error.message?.includes('JWT')) {
    return sendError(res, 'Invalid or expired token', 401);
  }
  
  if (error.message?.includes('Row Level Security')) {
    return sendError(res, 'Access denied', 403);
  }
  
  // Generic database error
  sendError(res, 'Database operation failed', 500, error.message);
}

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object|null} Validation error object or null if valid
 */
function validateRequiredFields(body, requiredFields) {
  const missingFields = requiredFields.filter(field => {
    const value = body[field];
    return value === undefined || value === null || 
           (typeof value === 'string' && value.trim() === '');
  });
  
  if (missingFields.length > 0) {
    return {
      message: `Missing required fields: ${missingFields.join(', ')}`,
      statusCode: 400
    };
  }
  
  return null;
}

/**
 * Create paginated response
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination info
 * @param {string} dataKey - Key name for data array (default: 'data')
 */
function createPaginatedResponse(data, pagination, dataKey = 'data') {
  return {
    [dataKey]: data,
    pagination: {
      page: parseInt(pagination.page) || 1,
      limit: parseInt(pagination.limit) || 10,
      total: pagination.total || data.length,
      totalPages: Math.ceil((pagination.total || data.length) / (parseInt(pagination.limit) || 10))
    }
  };
}

/**
 * Async error handler wrapper for route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped function with error handling
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  sendSuccess,
  sendError,
  handleDatabaseError,
  validateRequiredFields,
  createPaginatedResponse,
  asyncHandler
};
