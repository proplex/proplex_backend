import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import { UserRole } from '@/models/user.model';
import { IUser } from '@/models/user.model';
import { Types } from 'mongoose';
import { NotAuthorizedError } from '@/errors/not-authorized-error';

// JWT secret (should match the one used in admin.controller.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

/**
 * Middleware to validate admin JWT token without database lookup
 * This middleware checks for a valid admin JWT token in the Authorization header
 * If a valid admin token is found, it attaches the user info to the request object
 * If no valid admin token is found, it continues to the next middleware
 */
export const validateAdminToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    console.log("header is here:",authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // If no Bearer token, continue to next middleware
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      // If no token, continue to next middleware
      return next();
    }

    // Verify the token
    const decoded: any = verify(token, JWT_SECRET);
    console.log("decoded token is here:",decoded);
    
    // Check if the user has admin role
    if (decoded.role === UserRole.ADMIN) {
      // Validate that the ID is in the correct format
      let userIdObj;
      try {
        userIdObj = new Types.ObjectId(decoded.id);
        console.log("userobj is here:",userIdObj);
      } catch (error) {
        console.log('Invalid userId format in token, using as string');
        // If it's not a valid ObjectId, we'll still use it but log a warning
        userIdObj = decoded.id;
      }
      
      // Attach the decoded user info to the request object
      (req as any).user = {
        _id: userIdObj,
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      } as IUser & { _id: Types.ObjectId };

      console.log("user is herein admin-auth ",userIdObj);
      
      console.log('Admin token validated, userId:', decoded.id);
      
      // Skip to next middleware since we have a valid admin token
      return next();
    }
    
    // If not an admin token, continue to next middleware
    next();
  } catch (error: any) {
    // If token verification fails, continue to next middleware
    console.log('Token verification failed:', error.message);
    next();
  }
};

/**
 * Middleware to require admin authentication
 * This middleware ensures that the request is made by an admin user
 */
export const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    throw new NotAuthorizedError('Authentication required');
  }
  
  // Allow both ADMIN and COMPANY_ADMIN roles
  if (![UserRole.ADMIN, UserRole.COMPANY_ADMIN].includes(req.user.role as UserRole)) {
    throw new NotAuthorizedError('Admin or company admin access required');
  }
  
  next();
};

/**
 * Middleware to require strict admin authentication (ADMIN role only)
 * This middleware ensures that the request is made by an admin user with ADMIN role
 */
export const requireStrictAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    throw new NotAuthorizedError('Authentication required');
  }
  
  // Allow only ADMIN role
  if (req.user.role !== UserRole.ADMIN) {
    throw new NotAuthorizedError('Admin access required');
  }
  
  next();
};