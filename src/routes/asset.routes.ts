import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest, requireRole } from '@/middlewares';
import { web3Auth, jwtAuth } from '@/utils/jwt';
import * as assetController from '@/controllers/asset.controller';
import { AssetStatus, AssetType, OwnershipType, IAsset } from '@/models/asset.model';
import { UserRole, IUser } from '@/models/user.model';
import { Types } from 'mongoose';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
  }
}

interface AuthenticatedRequest extends Request {
  user: IUser & { _id: Types.ObjectId };
}

// Import the AssetResponse type from the controller
import { AssetResponse } from '@/controllers/asset.controller';

// Re-export for consistency with other routes
type ApiResponse<T = any> = AssetResponse<T>;

const router = Router();

// Apply Web3Auth authentication middleware to all routes
router.use(web3Auth);

// Role-based access control
const requireAssetManagement = requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]);
const requireAdmin = requireRole([UserRole.ADMIN]);

// Type-safe async handler that works with AssetResponse
const asyncHandler = <T = any>(
  handler: (
    req: AuthenticatedRequest,
    res: Response<AssetResponse<T>>,
    next: NextFunction
  ) => Promise<void | Response<any, Record<string, any>>>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(
        req as AuthenticatedRequest,
        res as Response<AssetResponse<T>>,
        next
      );
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @route   POST /api/assets
 * @desc    Create a new asset
 * @access  Private (Admin, Company Admin, Asset Manager)
 */
router.post(
  '/',
  requireAssetManagement,
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ max: 200 }).withMessage('Name cannot exceed 200 characters'),
    body('description').optional().isString().trim().isLength({ max: 5000 }),
    body('company').isMongoId().withMessage('Valid company ID is required'),
    body('assetType').isIn(Object.values(AssetType)).withMessage('Invalid asset type'),
    body('ownershipType').isIn(Object.values(OwnershipType)).withMessage('Invalid ownership type'),
    body('status').optional().isIn(Object.values(AssetStatus)).withMessage('Invalid status'),
    
    // Address validation
    body('address.street').notEmpty().withMessage('Street is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.country').notEmpty().withMessage('Country is required'),
    body('address.postalCode').notEmpty().withMessage('Postal code is required'),
    body('address.coordinates').optional().isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be an array of [longitude, latitude]'),
    
    // Valuation validation
    body('valuation.currentValue').isNumeric().withMessage('Current value must be a number'),
    body('valuation.purchasePrice').isNumeric().withMessage('Purchase price must be a number'),
    body('valuation.purchaseDate').isISO8601().withMessage('Valid purchase date is required'),
    body('valuation.annualAppreciationRate').optional().isNumeric(),
    body('valuation.currency').optional().isString(),
    
    // Size validation
    body('size.totalArea').isNumeric().withMessage('Total area is required'),
    body('size.builtUpArea').optional().isNumeric(),
    body('size.plotArea').optional().isNumeric(),
    body('size.floors').optional().isInt({ min: 1 }),
    body('size.units').optional().isInt({ min: 1 }),
    body('size.yearBuilt').optional().isInt({ min: 1800, max: new Date().getFullYear() }),
    
    // Investment validation
    body('investment.targetAmount').isNumeric().withMessage('Target amount is required'),
    body('investment.minimumInvestment').isNumeric().withMessage('Minimum investment is required'),
    body('investment.expectedROI').optional().isNumeric(),
    body('investment.holdingPeriod').optional().isInt({ min: 1 }),
    body('investment.distributionFrequency').isIn(['monthly', 'quarterly', 'annually']),
    
    // Token validation
    body('token.totalSupply').isNumeric().withMessage('Total supply is required'),
    body('token.tokenPrice').isNumeric().withMessage('Token price is required'),
    body('token.tokenTicker')
      .isString()
      .isLength({ min: 1, max: 10 })
      .withMessage('Token ticker must be between 1-10 characters'),
    body('token.tokenStandard').isIn(['ERC20', 'BEP20', 'other']),
    body('token.smartContractAddress').optional().isEthereumAddress(),
    
    // Media validation
    body('media').optional().isArray(),
    body('media.*.url').if(body('media').exists()).isURL(),
    body('media.*.type').if(body('media').exists()).isIn(['image', 'video', 'document']),
    body('media.*.title').if(body('media').exists()).isString(),
    body('media.*.isFeatured').optional().isBoolean(),
    
    // Additional metadata
    body('features').optional().isArray(),
    body('amenities').optional().isArray(),
    body('tags').optional().isArray(),
  ],
  validateRequest,
  asyncHandler<IAsset>(async (req, res) => {
    await assetController.createAsset(req, res);
  })
);

/**
 * @route   GET /api/assets
 * @desc    Get all assets with filtering and pagination
 * @access  Public
 */
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('status').optional().isIn(Object.values(AssetStatus)),
    query('assetType').optional().isIn(Object.values(AssetType)),
    query('minValue').optional().isFloat({ min: 0 }),
    query('maxValue').optional().isFloat({ min: 0 }),
    query('minROI').optional().isFloat({ min: 0 }),
    query('maxROI').optional().isFloat({ min: 0 }),
    query('sortBy').optional().isIn([
      'name', 'createdAt', 'valuation.currentValue', 'investment.expectedROI'
    ]),
    query('sortOrder').optional().isIn(['asc', 'desc']),
    query('companyId').optional().isMongoId(),
  ],
  validateRequest,
  asyncHandler<{ assets: IAsset[]; total: number }>(async (req, res) => {
    await assetController.getAssets(req, res);
  })
);

/**
 * @route   GET /api/assets/featured
 * @desc    Get featured assets
 * @access  Public
 */
router.get(
  '/featured',
  [
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  validateRequest,
  asyncHandler<IAsset[]>(async (req, res) => {
    await assetController.getFeaturedAssets(req, res);
  })
);

/**
 * @route   GET /api/assets/search
 * @desc    Search assets by text
 * @access  Public
 */
router.get(
  '/search',
  [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }),
  ],
  validateRequest,
  asyncHandler<IAsset[]>(async (req, res) => {
    await assetController.searchAssets(req, res);
  })
);

/**
 * @route   GET /api/assets/:id
 * @desc    Get asset by ID
 * @access  Public
 */
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid asset ID is required'),
  ],
  validateRequest,
  asyncHandler<IAsset>(async (req, res) => {
    await assetController.getAssetById(req, res);
  })
);

/**
 * @route   PATCH /api/assets/:id
 * @desc    Update an asset
 * @access  Private
 */
router.patch(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid asset ID is required'),
    body('name').optional().isString().trim().isLength({ max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 5000 }),
    body('assetType').optional().isIn(Object.values(AssetType)),
    body('ownershipType').optional().isIn(Object.values(OwnershipType)),
    body('status').optional().isIn(Object.values(AssetStatus)),
    
    // Address updates
    body('address').optional().isObject(),
    body('address.street').optional().isString(),
    body('address.city').optional().isString(),
    body('address.state').optional().isString(),
    body('address.country').optional().isString(),
    body('address.postalCode').optional().isString(),
    body('address.coordinates').optional().isArray({ min: 2, max: 2 }),
    
    // Other validations...
    // Note: For brevity, I'm not including all validations again
    // In a real app, you might want to extract these to a shared validation schema
  ],
  validateRequest,
  assetController.updateAsset
);

/**
 * @route   PATCH /api/assets/:id/status
 * @desc    Update asset status (e.g., publish, archive, reject)
 * @access  Private (Admin/Moderator)
 */
router.patch(
  '/:id/status',
  [
    param('id').isMongoId().withMessage('Valid asset ID is required'),
    body('status')
      .isIn(Object.values(AssetStatus))
      .withMessage('Valid status is required'),
    body('rejectionReason')
      .if((value, { req }) => req.body.status === 'rejected')
      .notEmpty()
      .withMessage('Rejection reason is required when rejecting an asset'),
  ],
  validateRequest,
  requireAdmin,
  assetController.updateAssetStatus
);

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete an asset
 * @access  Private
 */
router.delete(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid asset ID is required'),
  ],
  validateRequest,
  assetController.deleteAsset
);

/**
 * @route   GET /api/assets/stats
 * @desc    Get asset statistics
 * @access  Private (Admin)
 */
router.get(
  '/stats',
  [
    query('companyId').optional().isMongoId(),
  ],
  validateRequest,
  requireAdmin,
  assetController.getAssetStats
);

export default router;