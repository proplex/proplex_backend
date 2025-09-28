import { Router } from 'express';
import { body, param } from 'express-validator';
import { 
  getWallet,
  getTransactions,
  depositFunds,
  withdrawFunds,
  transferFunds,
  adminGetUserWallet,
  adminUpdateWalletBalance
} from '@/controllers/wallet.controller';
import { web3Auth } from '@/utils/jwt';
import { requireAdmin } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validate-request';

const router = Router();

// Get user's wallet
router.get('/', web3Auth, getWallet);

// Get wallet transactions
router.get('/transactions', web3Auth, getTransactions);

// Deposit funds
router.post(
  '/deposit',
  web3Auth,
  [
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be greater than 0'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  validateRequest,
  depositFunds
);

// Withdraw funds
router.post(
  '/withdraw',
  [
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be greater than 0'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  validateRequest,
  withdrawFunds
);

// Transfer funds to another user
router.post(
  '/transfer',
  [
    body('recipientId')
      .notEmpty()
      .withMessage('Recipient ID is required'),
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be greater than 0'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  validateRequest,
  transferFunds
);

// Admin routes
router.use(...requireAdmin);

// Get user wallet (admin)
router.get(
  '/user/:userId',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
  ],
  validateRequest,
  adminGetUserWallet
);

// Update user wallet balance (admin)
router.patch(
  '/user/:userId/balance',
  [
    param('userId')
      .isMongoId()
      .withMessage('Invalid user ID'),
    body('amount')
      .isFloat({ gt: 0 })
      .withMessage('Amount must be greater than 0'),
    body('type')
      .isIn(['add', 'subtract'])
      .withMessage('Type must be either "add" or "subtract"'),
    body('description')
      .optional()
      .isString()
      .withMessage('Description must be a string')
  ],
  validateRequest,
  adminUpdateWalletBalance
);

export { router as walletRoutes };
