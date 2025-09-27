import { body, param, query } from 'express-validator';
import { CompanyType, SpvType, BankAccountType } from '@/models/company.model';

export const createCompanyValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ max: 200 }).withMessage('Company name cannot exceed 200 characters'),
    
  body('industry').notEmpty().withMessage('Industry is required'),
  
  body('incorporationType')
    .isIn(CompanyType)
    .withMessage(`Invalid company type. Must be one of: ${CompanyType.join(', ')}`),
    
  body('jurisdiction').notEmpty().withMessage('Jurisdiction is required'),
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('city').notEmpty().withMessage('City is required'),
  body('state').notEmpty().withMessage('State is required'),
  body('country').notEmpty().withMessage('Country is required'),
  body('pincode').notEmpty().withMessage('Pincode is required'),
  
  body('isSpv').optional().isBoolean(),
  body('spvType')
    .optional()
    .isIn(SpvType)
    .withMessage(`Invalid SPV type. Must be one of: ${SpvType.join(', ')}`),
    
  body('parentCompany').optional().isMongoId().withMessage('Invalid parent company ID'),
  body('status')
    .optional()
    .isIn(['draft', 'pending_verification', 'verified', 'rejected', 'suspended'])
    .withMessage('Invalid status'),
];

export const updateCompanyValidator = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Company name cannot exceed 200 characters'),
  body('email').optional().isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('isSpv').optional().isBoolean(),
  body('spvType')
    .optional()
    .isIn(SpvType)
    .withMessage(`Invalid SPV type. Must be one of: ${SpvType.join(', ')}`),
  body('parentCompany').optional().isMongoId().withMessage('Invalid parent company ID'),
];

export const bankAccountValidator = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('accountNumber').notEmpty().withMessage('Account number is required'),
  body('accountType')
    .isIn(BankAccountType)
    .withMessage(`Invalid account type. Must be one of: ${BankAccountType.join(', ')}`),
  body('bankName').notEmpty().withMessage('Bank name is required'),
  body('ifscCode').notEmpty().withMessage('IFSC code is required'),
  body('isPrimary').optional().isBoolean(),
  body('isVerified').optional().isBoolean(),
];

export const legalAdvisorValidator = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('firmName').notEmpty().withMessage('Firm name is required'),
  body('address').notEmpty().withMessage('Address is required'),
  body('isPrimary').optional().isBoolean(),
];

export const boardMemberValidator = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Invalid email address').normalizeEmail(),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('isDirector').optional().isBoolean(),
  body('address').notEmpty().withMessage('Address is required'),
];

export const documentValidator = [
  param('id').isMongoId().withMessage('Invalid company ID'),
  body('type').notEmpty().withMessage('Document type is required'),
  body('url').notEmpty().withMessage('Document URL is required'),
  body('name').optional().isString(),
  body('description').optional().isString(),
  body('size').optional().isNumeric(),
  body('mimeType').optional().isString(),
];

export const getCompaniesValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100').toInt(),
  query('search').optional().trim(),
  query('status').optional().isIn(['active', 'inactive', 'suspended']),
  query('isSpv').optional().isBoolean().toBoolean(),
  query('parentCompany').optional().isMongoId(),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
];
