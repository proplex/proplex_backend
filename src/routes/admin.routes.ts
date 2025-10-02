import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { verify } from 'jsonwebtoken';
import { validateRequest } from '@/middlewares/validate-request';
import { adminLogin, adminRegister, adminLogout } from '@/controllers/admin.controller';
import { NotAuthorizedError } from '@/errors/not-authorized-error';
import { UserRole } from '@/models/user.model';

// JWT secret (should match the one used in admin.controller.ts)
const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

// Custom middleware to validate admin JWT token without database lookup
const validateAdminToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new NotAuthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new NotAuthorizedError('No token provided');
    }

    // Verify the token
    const decoded: any = verify(token, JWT_SECRET);
    
    // Check if the user has admin role
    if (decoded.role !== UserRole.ADMIN) {
      throw new NotAuthorizedError('Admin access required');
    }
    
    // Attach the decoded user info to the request object
    (req as any).user = decoded;
    
    next();
  } catch (error) {
    next(new NotAuthorizedError('Invalid or expired token'));
  }
};

const router = Router();

/**
 * @route   POST /api/admin/login
 * @desc    Admin login with fixed credentials
 * @access  Public
 */
router.post(
  '/login',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .exists({ checkFalsy: true })
      .withMessage('Password is required'),
  ],
  adminLogin
);

/**
 * @route   POST /api/admin/logout
 * @desc    Admin logout
 * @access  Private (Admin only)
 */
router.post(
  '/logout',
  validateAdminToken,
  adminLogout
);

/**
 * @route   POST /api/admin/register
 * @desc    Admin registration
 * @access  Public
 */
router.post(
  '/register',
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  
  adminRegister
);

export default router;