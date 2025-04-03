"use client";

import { NextResponse } from 'next/server';

/**
 * Safe API response handler for Next.js API routes
 * Ensures that errors are returned as JSON and not as HTML pages
 * 
 * @param {Function} handler - The API route handler function
 * @returns {Function} - A wrapped handler that catches errors
 */
export function withErrorHandler(handler) {
  return async function(req, context) {
    try {
      // Call the original handler
      return await handler(req, context);
    } catch (error) {
      console.error('API Error:', error);

      // Ensure we return JSON instead of allowing Next.js to render an HTML error page
      return NextResponse.json(
        { 
          error: true, 
          message: error.message || 'An unexpected error occurred',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: error.status || 500 }
      );
    }
  };
}

/**
 * Creates a standardized API error response
 * 
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {NextResponse} - JSON error response
 */
export function createErrorResponse(message, status = 500) {
  return NextResponse.json(
    { error: true, message },
    { status }
  );
}

/**
 * Creates a standardized API success response
 * 
 * @param {object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {NextResponse} - JSON success response
 */
export function createSuccessResponse(data, status = 200) {
  return NextResponse.json(
    { error: false, ...data },
    { status }
  );
}

/**
 * Handle common API errors with appropriate responses
 * 
 * @param {Error} error - Error object
 * @returns {NextResponse} Next.js response object
 */
export function handleApiError(error) {
  console.error('API Error:', error);
  
  // Check for Prisma errors
  if (error.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma-specific errors
    switch (error.code) {
      case 'P2002':
        return createErrorResponse(409, 'Unique constraint violation', { 
          code: error.code,
          fields: error.meta?.target || []
        });
      case 'P2025':
        return createErrorResponse(404, 'Record not found', { code: error.code });
      default:
        return createErrorResponse(500, 'Database error', { code: error.code });
    }
  }
  
  // Handle validation errors
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    return createErrorResponse(400, 'Validation error', { 
      details: error.errors || error.format?.() || error.message
    });
  }
  
  // Handle authentication errors
  if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
    return createErrorResponse(401, 'Unauthorized');
  }
  
  // Handle other client errors
  if (error.status >= 400 && error.status < 500) {
    return createErrorResponse(error.status, error.message);
  }
  
  // Default server error response
  return createErrorResponse(
    500, 
    'Internal server error', 
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}
  );
} 