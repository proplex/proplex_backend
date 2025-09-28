// Base error class
export class CustomError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(
    message: string, 
    statusCode: number, 
    isOperational = true, 
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    
    // Maintain proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    // Set the prototype explicitly (needed for instanceof to work with TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// 400 Bad Request
export class BadRequestError extends CustomError {
  constructor(message = 'Bad Request', details?: any) {
    super(message, 400, true, details);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends CustomError {
  constructor(message = 'Unauthorized', details?: any) {
    super(message, 401, true, details);
  }
}

// 403 Forbidden
export class ForbiddenError extends CustomError {
  constructor(message = 'Forbidden', details?: any) {
    super(message, 403, true, details);
  }
}

// 404 Not Found
export class NotFoundError extends CustomError {
  constructor(message = 'Resource not found', details?: any) {
    super(message, 404, true, details);
  }
}

// 409 Conflict
export class ConflictError extends CustomError {
  constructor(message = 'Conflict', details?: any) {
    super(message, 409, true, details);
  }
}

// 422 Unprocessable Entity
export class ValidationError extends CustomError {
  constructor(message = 'Validation Error', details?: any) {
    super(message, 422, true, details);
  }
}

// 429 Too Many Requests
export class RateLimitError extends CustomError {
  constructor(message = 'Too many requests', details?: any) {
    super(message, 429, true, details);
  }
}

// 500 Internal Server Error
export class InternalServerError extends CustomError {
  constructor(message = 'Internal Server Error', details?: any) {
    super(message, 500, false, details);
  }
}

// 503 Service Unavailable
export class ServiceUnavailableError extends CustomError {
  constructor(message = 'Service Unavailable', details?: any) {
    super(message, 503, true, details);
  }
}

// Utility function to handle async/await errors
export const catchAsync = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    fn(req, res, next).catch(next);
  };
};

// Error handling middleware
export const errorHandler = (
  err: any,
  req: any,
  res: any,
  next: any
) => {
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details;

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    const field = Object.keys(err.keyPattern)[0];
    details = { [field]: `This ${field} is already in use` };
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Handle Mongoose cast errors (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      statusCode: err.statusCode,
      details: err.details
    });
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
