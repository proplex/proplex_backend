import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Combines multiple middleware functions into a single middleware function
 */
export const combineMiddleware = (
  ...middlewares: Array<RequestHandler | RequestHandler[]>
): RequestHandler[] => {
  return middlewares.flat();
};
