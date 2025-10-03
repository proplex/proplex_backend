import { Request, Response, NextFunction } from 'express';
import { JwtPayload, verify, sign } from 'jsonwebtoken';
import { Types } from 'mongoose';
import crypto from 'crypto';
import { NotAuthorizedError } from '@/errors/not-authorized-error';
import { IUser, UserRole } from '@/models/user.model';
import User from '@/models/user.model';

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
  }
}

// JWT secret (in a real application, this should be stored in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

// Web3Auth configuration
const WEB3AUTH_ISSUER = 'https://api-auth.web3auth.io';
const WEB3AUTH_AUDIENCE = 'BI0orbjBmrDL-uiYLcrZ7uwH6jczl6Fatfh4N4GLY0voY5oJ_3U2BN7QAZejT1mmbne5VtR_0_16wM4jDKq7M_UE';

export const generateToken = (user: IUser & { _id: Types.ObjectId }): string => {
  return sign(
    {
      id: (user._id as unknown as Types.ObjectId).toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const verifyToken = async (token: string): Promise<IUser & { _id: Types.ObjectId }> => {
  try {
    const decoded = verify(token, JWT_SECRET) as JwtPayload;
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Convert to plain object and explicitly type the return value
    const userObj = user.toObject();
    return userObj as unknown as IUser & { _id: Types.ObjectId };
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid or expired token');
  }
};

export const verifyWeb3AuthToken = async (token: string): Promise<IUser & { _id: Types.ObjectId }> => {
  try {
    // In a production environment, you should verify the JWT signature
    // For now, we'll just decode it to get the user info
    const decoded = verify(token, '', { 
      issuer: WEB3AUTH_ISSUER,
      audience: WEB3AUTH_AUDIENCE,
      ignoreExpiration: false,
      algorithms: ['ES256']
    }) as JwtPayload;

    if (!decoded.email) {
      throw new Error('Invalid token: email not found');
    }

    // Find or create user based on the email
    let user = await User.findOne({ email: decoded.email });

    if (!user) {
      // Create a new user if they don't exist
      // Generate a random password
      const password = crypto.randomBytes(32).toString('hex');
      
      // Create a new user if they don't exist
      const newUser = new User({
        email: decoded.email,
        firstName: decoded.name?.split(' ')[0] || 'User',
        lastName: decoded.name?.split(' ').slice(1).join(' ') || '',
        role: UserRole.USER, // Default role
        password: password,
        isEmailVerified: true,
        isActive: true,
        lastLogin: new Date()
      });
      
      user = await newUser.save();
    } else {
      // Update last login time for existing user
      user.lastLogin = new Date();
      await user.save();
    }

    // Convert to plain object and explicitly type the return value
    const userObj = user.toObject();
    return userObj as unknown as IUser & { _id: Types.ObjectId };
  } catch (error) {
    console.error('JWT verification failed:', error);
    throw new Error('Invalid or expired token');
  }
};

export const web3Auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If user is already authenticated (e.g., by admin token validation), skip web3 auth
    if (req.user) {
      return next();
    }
    
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new NotAuthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new NotAuthorizedError('No token provided');
    }

    // Verify the token and get user
    const user = await verifyWeb3AuthToken(token);
    
    // Attach the user to the request object
    req.user = user;
    
    next();
  } catch (error) {
    next(new NotAuthorizedError('Invalid or expired token'));
  }
};

export const jwtAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // If user is already authenticated (e.g., by admin token validation), skip jwt auth
    if (req.user) {
      return next();
    }
    
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new NotAuthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new NotAuthorizedError('No token provided');
    }

    // Verify the token and get user
    const user = await verifyToken(token);
    
    // Attach the user to the request object
    req.user = user;
    
    next();
  } catch (error) {
    next(new NotAuthorizedError('Invalid or expired token'));
  }
};