import { Router } from 'express';
import * as companyController from '@/controllers/company.controller';
import { requireAuth, requireRole } from '@/middlewares';
import { UserRole } from '@/models/user.model';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Create a new company
router.post('/', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.createCompany);

// Get all companies (with pagination, filtering, and sorting)
router.get('/', companyController.getCompanies);

// Get a single company by ID
router.get('/:id', companyController.getCompanyById);

// Get company statistics
router.get('/:id/stats', companyController.getCompanyStats);

// Update a company
router.put('/:id', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.updateCompany);

// Update company status
router.patch('/:id/status', requireRole([UserRole.ADMIN]), companyController.updateCompanyStatus);

// Delete a company
router.delete('/:id', requireRole([UserRole.ADMIN]), companyController.deleteCompany);

// Bank Account Routes
router.post('/:id/bank-accounts', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.addBankAccount);
router.put('/:id/bank-accounts/:accountId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.updateBankAccount);
router.delete('/:id/bank-accounts/:accountId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.removeBankAccount);
router.patch('/:id/bank-accounts/:accountId/verify', requireRole([UserRole.ADMIN, UserRole.VERIFIER]), companyController.verifyBankAccount);

// Legal Advisor Routes
router.post('/:id/legal-advisors', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.addLegalAdvisor);
router.put('/:id/legal-advisors/:advisorId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.updateLegalAdvisor);
router.delete('/:id/legal-advisors/:advisorId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.removeLegalAdvisor);

// Board Member Routes
router.post('/:id/board-members', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.addBoardMember);
router.put('/:id/board-members/:memberId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.updateBoardMember);
router.delete('/:id/board-members/:memberId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.removeBoardMember);

// Document Routes
router.post('/:id/documents', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.uploadDocument);
router.delete('/:id/documents/:documentId', requireRole([UserRole.ADMIN, UserRole.COMPANY_ADMIN]), companyController.deleteDocument);

export default router;
