import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { RequestValidationError } from '@/errors/request-validation-error';
import { NotAuthorizedError } from '@/errors/not-authorized-error';

// Extend the Express Request type to include currentUser
declare global {
  namespace Express {
    interface Request {
      currentUser?: {
        id: string;
        role: string;
        [key: string]: any;
      };
    }
  }
}

export const validateRequest = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    throw new RequestValidationError(errors.array());
  };
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.currentUser) {
    throw new NotAuthorizedError('Authentication required');
  }
  next();
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // First check if user is authenticated
    if (!req.currentUser) {
      throw new NotAuthorizedError('Authentication required');
    }

    // Then check if user has required role
    if (!roles.includes(req.currentUser.role)) {
      throw new NotAuthorizedError(
        `Required role(s): ${roles.join(', ')}. Current role: ${req.currentUser.role}`
      );
    }

    next();
  };
};
