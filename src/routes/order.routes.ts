import { Router } from 'express';
import { body } from 'express-validator';
import { 
  createOrder, 
  getOrder, 
  getOrders, 
  cancelOrder, 
  getAllOrders 
} from '@/controllers/order.controller';
import { web3Auth } from '@/utils/jwt';
import { requireAdmin } from '@/middlewares/auth.middleware';
import { validateRequest } from '@/middlewares/validate-request';

const router = Router();

// Public routes (if any)

// Create a new order
router.post(
  '/',
  web3Auth,
  [
    body('assetId').notEmpty().withMessage('Asset ID is required'),
    body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
    body('price').isFloat({ gt: 0 }).withMessage('Price must be greater than 0'),
    body('type').isIn(['buy', 'sell']).withMessage('Invalid order type')
  ],
  validateRequest,
  createOrder
);

// Get user's orders
router.get('/', getOrders);

// Get a specific order
router.get('/:id', getOrder);

// Cancel an order
router.patch('/:id/cancel', cancelOrder);

// Admin routes
router.use(...requireAdmin);

// Get all orders (admin only)
router.get('/admin/all', getAllOrders);

export { router as orderRoutes };
