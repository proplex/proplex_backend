import { Request, Response, NextFunction } from 'express';
import { sign } from 'jsonwebtoken';
import { BadRequestError } from '@/errors/bad-request-error';
import { NotAuthorizedError } from '@/errors/not-authorized-error';
import { UserRole } from '@/models/user.model';
import crypto from 'crypto';
// Import the User model
import User from '@/models/user.model';

// Admin credentials (in a real application, these should be stored securely)
const ADMIN_EMAIL = 'everythinggaurav48@gmail.com';
const ADMIN_PASSWORD = 'Abcd@1234';

// JWT secret (in a real application, this should be stored in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

// Generate a deterministic admin user ID (since we're not using the database)
const ADMIN_USER_ID = crypto.createHash('md5').update(ADMIN_EMAIL).digest('hex');

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

interface RegisterRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
}

interface LogoutResponse {
  success: boolean;
  message: string;
}

export const adminLogout = async (
  req: Request,
  res: Response<LogoutResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('=== Admin Logout Request ===');
    
    // For JWT tokens, logout is primarily handled client-side by removing the token
    // Server-side, we can optionally add the token to a blacklist if implemented
    // But for this implementation, we'll just send a success response
    
    res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('Error in adminLogout:', error);
    next(error);
  }
};

export const adminLogin = async (
  req: Request<{}, {}, LoginRequest>,
  res: Response<LoginResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('=== Admin Login Request ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: Email or password missing');
      throw new BadRequestError('Email and password are required');
    }

    // Check if credentials match admin credentials
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      console.log('Invalid credentials provided');
      throw new NotAuthorizedError('Invalid credentials');
    }

    // Generate JWT token without database interaction
    const token = sign(
      {
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        role: UserRole.ADMIN,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('Login successful, returning token');
    res.status(200).json({
      success: true,
      token,
      user: {
        id: ADMIN_USER_ID,
        email: ADMIN_EMAIL,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
      },
    });
  } catch (error) {
    console.error('Error in adminLogin:', error);
    next(error);
  }
};

export const adminRegister = async (
  req: Request<{}, {}, RegisterRequest>,
  res: Response<RegisterResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('=== Admin Registration Request ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    console.log("admin login and register information:", email, password);

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: Email or password missing');
      throw new BadRequestError('Email and password are required');
    }

    // Check if this is the fixed admin account
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      console.log('Credentials match admin credentials');
      try {
        // Try to create admin user in database
        console.log('Looking for existing user...');
        let user = await User.findOne({ email: ADMIN_EMAIL });
        console.log('Existing user lookup result:', user);
        
        if (!user) {
          console.log('No existing user found, creating new admin user');
          // Create admin user if not exists
          user = new User({
            email: ADMIN_EMAIL,
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
            password: ADMIN_PASSWORD, // Will be hashed by the pre-save hook
            isEmailVerified: true,
            isActive: true,
          });
          await user.save();
          console.log('New user created:', user);
        } else if (user.role !== UserRole.ADMIN) {
          console.log('User exists but is not admin, updating role');
          // Update user role to admin if it's not already
          user.role = UserRole.ADMIN;
          await user.save();
          console.log('User role updated:', user);
        } else {
          console.log('User already exists as admin');
        }

        res.status(201).json({
          success: true,
          message: 'Admin user created/updated successfully',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        });
      } catch (dbError) {
        // If database operation fails, still return success but with a warning
        console.error('Database error during admin registration:', dbError);
        res.status(201).json({
          success: true,
          message: 'Admin credentials validated but database operation failed. You can still login with the fixed credentials.',
        });
      }
    } else {
      console.log('Credentials do not match admin credentials');
      throw new BadRequestError('Only the fixed admin credentials can be registered');
    }
  } catch (error) {
    console.error('Error in adminRegister:', error);
    next(error);
  }
};