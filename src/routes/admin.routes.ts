import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '@/middlewares/validate-request';
import { adminLogin, adminRegister } from '@/controllers/admin.controller';

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