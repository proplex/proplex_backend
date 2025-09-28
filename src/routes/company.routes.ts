import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest, requireRole } from '@/middlewares';
import { web3Auth } from '@/utils/jwt';
import * as companyController from '@/controllers/company.controller';
import { UserRole, IUser } from '@/models/user.model';
import { Types } from 'mongoose';
import { ICompany } from '@/models/company.model';
import { AssetResponse } from '@/controllers/asset.controller';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
  }
}

interface AuthenticatedRequest extends Request {
  user: IUser & { _id: Types.ObjectId; role: UserRole };
}

// Re-export for consistency with other routes
type ApiResponse<T = any> = AssetResponse<T>;

// Type-safe async handler
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

const router = Router();

// Apply Web3Auth authentication middleware to all routes
router.use(web3Auth);

// Role-based access control
const requireCompanyAdmin = requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]);
const requireAdmin = requireRole([UserRole.ADMIN]);


// Create a new company
router.post(
  '/',
  requireCompanyAdmin,
  [
    body('name').trim().notEmpty().withMessage('Company name is required'),
    body('legalName').trim().notEmpty().withMessage('Legal name is required'),
    body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
    body('taxId').optional().trim(),
    body('website').optional().isURL().withMessage('Valid website URL is required'),
    body('description').optional().trim(),
    body('foundingDate').optional().isISO8601().withMessage('Valid date is required'),
    body('address').isObject().withMessage('Address is required'),
    body('address.street').notEmpty().withMessage('Street is required'),
    body('address.city').notEmpty().withMessage('City is required'),
    body('address.state').notEmpty().withMessage('State is required'),
    body('address.country').notEmpty().withMessage('Country is required'),
    body('address.postalCode').notEmpty().withMessage('Postal code is required'),
    body('address.coordinates').optional().isArray({ min: 2, max: 2 })
      .withMessage('Coordinates must be [longitude, latitude]'),
    body('contactEmail').isEmail().withMessage('Valid contact email is required'),
    body('contactPhone').optional().isString(),
    body('logo').optional().isURL().withMessage('Logo must be a valid URL'),
    body('status').optional().isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
  ],
  validateRequest,
  asyncHandler<ICompany>(async (req, res) => {
    await companyController.createCompany[1](req, res, () => {});
  })
);

// Get all companies with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString().trim(),
    query('status').optional().isIn(['active', 'inactive', 'suspended']),
    query('isSpv').optional().isIn(['true', 'false']),
    query('parentCompany').optional().isMongoId(),
    query('sortBy').optional().isIn(['name', 'createdAt', 'updatedAt']),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validateRequest,
  asyncHandler<{ items: ICompany[]; total: number }>(async (req, res) => {
    await companyController.getCompanies[1](req, res, () => {});
  })
);

// Get a single company by ID
router.get(
  '/:id',
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
  ],
  validateRequest,
  asyncHandler<ICompany>(async (req, res) => {
    await companyController.getCompany(req, res, () => {});
  })
);

// Get company statistics
router.get(
  '/:id/stats',
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
  ],
  validateRequest,
  asyncHandler(companyController.getCompanyStats)
);

// Update a company
router.put(
  '/:id',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    body('name').optional().trim().notEmpty(),
    body('legalName').optional().trim().notEmpty(),
    body('registrationNumber').optional().trim().notEmpty(),
    body('taxId').optional().trim(),
    body('website').optional().isURL(),
    body('description').optional().trim(),
    body('foundingDate').optional().isISO8601(),
    body('address').optional().isObject(),
    body('contactEmail').optional().isEmail(),
    body('contactPhone').optional().isString(),
    body('logo').optional().isURL(),
  ],
  validateRequest,
  asyncHandler<ICompany>(async (req, res) => {
    await companyController.updateCompany[1](req, res, () => {});
  })
);

// Update company status
router.patch(
  '/:id/status',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    body('status').isIn(['active', 'inactive', 'suspended'])
      .withMessage('Invalid status'),
    body('rejectionReason').optional().isString().trim(),
  ],
  validateRequest,
  asyncHandler<ICompany>(async (req, res) => {
    await companyController.updateCompanyStatus(req, res, () => {});
  })
);

// Delete a company
router.delete(
  '/:id',
  requireAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
  ],
  validateRequest,
  asyncHandler<{ success: boolean }>(async (req, res) => {
    await companyController.deleteCompany(req, res, () => {});
  })
);

// Bank Account Routes
const bankAccountValidations = [
  param('id').isMongoId().withMessage('Valid company ID is required'),
  param('accountId').optional().isMongoId().withMessage('Valid account ID is required'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('routingNumber').notEmpty().withMessage('Routing number is required'),
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('accountType').isIn(['checking', 'savings']).withMessage('Invalid account type'),
  body('currency').default('USD').isString().withMessage('Currency is required'),
  body('isPrimary').optional().isBoolean().withMessage('isPrimary must be a boolean'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be a boolean'),
];

router.post(
  '/:id/bank-accounts',
  requireCompanyAdmin,
  [
    ...bankAccountValidations.filter(v => !v.toString().includes('accountId')),
    body('isPrimary').default(false).isBoolean(),
  ],
  validateRequest,
  asyncHandler(companyController.addBankAccount)
);

router.put(
  '/:id/bank-accounts/:accountId',
  requireCompanyAdmin,
  bankAccountValidations,
  validateRequest,
  asyncHandler(companyController.updateBankAccount)
);

router.delete(
  '/:id/bank-accounts/:accountId',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    param('accountId').isMongoId().withMessage('Valid account ID is required'),
  ],
  validateRequest,
  asyncHandler(companyController.removeBankAccount)
);

router.patch(
  '/:id/bank-accounts/:accountId/verify',
  requireRole([UserRole.ADMIN, UserRole.VERIFIER]),
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    param('accountId').isMongoId().withMessage('Valid account ID is required'),
    body('isVerified').isBoolean().withMessage('isVerified is required'),
    body('verifiedBy').optional().isString(),
    body('verificationNotes').optional().isString(),
  ],
  validateRequest,
  asyncHandler(companyController.verifyBankAccount)
);

// Legal Advisor Routes
const legalAdvisorValidations = [
  param('id').isMongoId().withMessage('Valid company ID is required'),
  param('advisorId').optional().isMongoId().withMessage('Valid advisor ID is required'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().isString(),
  body('firm').optional().isString(),
  body('barNumber').optional().isString(),
  body('licenseNumber').optional().isString(),
  body('isPrimary').optional().isBoolean(),
];

router.post(
  '/:id/legal-advisors',
  requireCompanyAdmin,
  legalAdvisorValidations.filter(v => !v.toString().includes('advisorId')),
  validateRequest,
  asyncHandler(companyController.addLegalAdvisor)
);

router.put(
  '/:id/legal-advisors/:advisorId',
  requireCompanyAdmin,
  legalAdvisorValidations,
  validateRequest,
  asyncHandler(companyController.updateLegalAdvisor)
);

router.delete(
  '/:id/legal-advisors/:advisorId',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    param('advisorId').isMongoId().withMessage('Valid advisor ID is required'),
  ],
  validateRequest,
  asyncHandler(companyController.removeLegalAdvisor)
);

// Board Member Routes
const boardMemberValidations = [
  param('id').isMongoId().withMessage('Valid company ID is required'),
  param('memberId').optional().isMongoId().withMessage('Valid member ID is required'),
  body('user').isMongoId().withMessage('Valid user ID is required'),
  body('role').notEmpty().withMessage('Role is required'),
  body('joinDate').optional().isISO8601(),
  body('isActive').optional().isBoolean(),
];

router.post(
  '/:id/board-members',
  requireCompanyAdmin,
  boardMemberValidations.filter(v => !v.toString().includes('memberId')),
  validateRequest,
  asyncHandler(companyController.addBoardMember)
);

router.put(
  '/:id/board-members/:memberId',
  requireCompanyAdmin,
  boardMemberValidations,
  validateRequest,
  asyncHandler(companyController.updateBoardMember)
);

router.delete(
  '/:id/board-members/:memberId',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    param('memberId').isMongoId().withMessage('Valid member ID is required'),
  ],
  validateRequest,
  asyncHandler(companyController.removeBoardMember)
);

// Document Routes
router.post(
  '/:id/documents',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    body('name').notEmpty().withMessage('Document name is required'),
    body('type').notEmpty().withMessage('Document type is required'),
    body('url').isURL().withMessage('Valid document URL is required'),
    body('expiryDate').optional().isISO8601(),
    body('isVerified').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(companyController.uploadDocument)
);

router.delete(
  '/:id/documents/:documentId',
  requireCompanyAdmin,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    param('documentId').isMongoId().withMessage('Valid document ID is required'),
  ],
  validateRequest,
  asyncHandler(companyController.deleteDocument)
);

export default router;
