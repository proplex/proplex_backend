import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createInvestment, 
  getInvestment, 
  getInvestments, 
  exitInvestment, 
  getAllInvestments,
  getCompanyInvestors
} from '@/controllers/investor.controller';
import { web3Auth } from '@/utils/jwt';
import { requireAdmin } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validate-request';
import { combineMiddleware } from '@/utils/middleware';

const router = Router();

// Public routes (if any)

// Create a new investment
router.post(
  '/',
  web3Auth, // Apply Web3Auth middleware
  [
    body('companyId').notEmpty().withMessage('Company ID is required'),
    body('investmentAmount').isFloat({ gt: 0 }).withMessage('Investment amount must be greater than 0'),
    body('ownershipPercentage').isFloat({ gt: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100')
  ],
  validateRequest,
  createInvestment
);

// Get user's investments
router.get('/', web3Auth, getInvestments);

// Get a specific investment
router.get('/:id', web3Auth, getInvestment);

// Exit an investment
router.patch('/:id/exit', web3Auth, exitInvestment);

// Get investors for a company
router.get('/company/:companyId', web3Auth, getCompanyInvestors);

// Admin routes - require admin role (which includes its own auth check)
router.get('/admin/all', ...requireAdmin, getAllInvestments);

export { router as investorRoutes };
