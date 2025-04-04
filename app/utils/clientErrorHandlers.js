"use client";

/**
 * Client-side error handlers for use in client components
 * This provides client-side equivalents to the API error handlers
 */

/**
 * Format and handle errors in client components
 * @param {Error} error - The error object
 * @returns {Object} - Formatted error with message
 */
export function handleClientError(error) {
  console.error('Client Error:', error);
  return {
    error: true,
    message: error.message || 'An unexpected error occurred',
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  };
}

/**
 * Creates a standardized client error response
 * @param {string} message - Error message 
 * @returns {Object} - Client error response
 */
export function createClientErrorResponse(message) {
  return {
    error: true,
    message
  };
}

/**
 * Creates a standardized client success response
 * @param {object} data - Response data
 * @returns {Object} - Client success response
 */
export function createClientSuccessResponse(data) {
  return {
    error: false,
    ...data
  };
} 