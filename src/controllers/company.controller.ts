import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Types } from 'mongoose';
import { IUser } from '@/models/user.model';

declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
    
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

import * as companyService from '@/services/company.service';
import { IBankAccount, ILegalAdvisor, IBoardMember, IDocument } from '@/models/company.model';
import { UserRole } from '@/models/user.model';

import { 
  createCompanyValidator, 
  updateCompanyValidator, 
  bankAccountValidator, 
  legalAdvisorValidator, 
  boardMemberValidator, 
  documentValidator, 
  getCompaniesValidator 
} from '@/validations/company.validator';
import { 
  validate, 
  globalErrorHandler, 
  NotFoundError, 
  UnauthorizedError, 
  ForbiddenError, 
  BadRequestError
} from '@/middleware/error.middleware';

// Helper function to safely convert string to ObjectId
const toObjectId = (id: string | Types.ObjectId | undefined): Types.ObjectId => {
  if (!id) {
    throw new BadRequestError('ID is required');
  }
  try {
    return typeof id === 'string' ? new Types.ObjectId(id) : id;
  } catch (error) {
    throw new BadRequestError('Invalid ID format');
  }
};

// Apply error handling middleware
export const handleErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  globalErrorHandler(err, req, res, next);
};

// Company CRUD operations
export const createCompany: RequestHandler[] = [
  validate(createCompanyValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?._id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }
      
      const company = await companyService.createCompany(req.body, userId.toString());
      res.status(201).json({ 
        success: true, 
        data: company 
      });
    } catch (error) {
      next(error);
    }
  }
];

export const getCompanies: RequestHandler[] = [
  validate(getCompaniesValidator),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        status, 
        isSpv, 
        parentCompany,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;
      
      const result = await companyService.getCompanies({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        status: status as string,
        isSpv: isSpv === 'true' ? true : isSpv === 'false' ? false : undefined,
        parentCompany: parentCompany as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });
      
      res.status(200).json({ 
        success: true, 
        ...result 
      });
    } catch (error) {
      next(error);
    }
  }
];

export const getCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.getCompanyById(req.params.id, [
      'parentCompany', 
      'createdBy', 
      'verifiedBy'
    ]);
    
    if (!company) {
      throw new NotFoundError('Company');
    }
    
    res.status(200).json({ 
      success: true, 
      data: company 
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompany = [
  ...updateCompanyValidator,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedError('Authentication required');
      }
      
      const company = await companyService.getCompanyById(req.params.id);
      if (!company) {
        throw new NotFoundError('Company');
      }
      
      // Check permissions
      if (req.user?.role !== 'admin' && 
          company.createdBy && 
          company.createdBy.toString() !== userId.toString()) {
        throw new ForbiddenError();
      }
      
      const updatedCompany = await companyService.updateCompany(
        req.params.id, 
        req.body, 
        userId.toString()
      );
      
      res.status(200).json({ 
        success: true, 
        data: updatedCompany 
      });
    } catch (error) {
      next(error);
    }
  }
];

export const deleteCompany = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const company = await companyService.getCompanyById(req.params.id);
    if (!company) {
      throw new NotFoundError('Company');
    }
    
    // Only allow admins or the company creator to delete
    if (req.user?.role !== 'admin' && 
        company.createdBy && 
        company.createdBy.toString() !== userId.toString()) {
      throw new ForbiddenError();
    }
    
    const deleted = await companyService.deleteCompany(req.params.id);
    if (!deleted) {
      throw new Error('Failed to delete company');
    }
    
    res.status(200).json({ 
      success: true, 
      message: 'Company deleted successfully' 
    });
  } catch (error) {
    next(error);
  }
};

export const updateCompanyStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, rejectionReason } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }
    
    // Only allow admins to update status
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only administrators can update company status');
    }
    
    const company = await companyService.updateCompanyStatus(
      req.params.id, 
      status, 
      userId.toString(),
      rejectionReason
    );
    
    if (!company) {
      throw new NotFoundError('Company');
    }
    
    res.status(200).json({ 
      success: true, 
      data: company 
    });
  } catch (error) {
    next(error);
  }
};

export const getCompanyStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await companyService.getCompanyStats(req.params.id);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};

// Bank Account operations
export const addBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.addBankAccount(
      req.params.companyId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const updateBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.updateBankAccount(
      req.params.companyId,
      req.params.accountId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const removeBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.removeBankAccount(
      req.params.companyId,
      req.params.accountId,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const verifyBankAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isVerified } = req.body;
    const userId = req.user?.id?.toString() || '';
    const company = await companyService.verifyBankAccount(
      req.params.companyId,
      req.params.accountId,
      isVerified,
      userId
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// Legal Advisor operations
export const addLegalAdvisor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.addLegalAdvisor(
      req.params.companyId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const updateLegalAdvisor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.updateLegalAdvisor(
      req.params.companyId,
      req.params.advisorId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const removeLegalAdvisor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.removeLegalAdvisor(
      req.params.companyId,
      req.params.advisorId,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// Board Member operations
export const addBoardMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.addBoardMember(
      req.params.companyId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const updateBoardMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.updateBoardMember(
      req.params.companyId,
      req.params.memberId,
      req.body,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const removeBoardMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.removeBoardMember(
      req.params.companyId,
      req.params.memberId,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

// Extend Express Request type to include file property
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

// Document operations
export const uploadDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new BadRequestError('No file uploaded');
    }

    const document: IDocument = {
      name: req.file.originalname,
      type: req.file.mimetype.startsWith('image/') ? 'image' : 'document',
      url: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      uploadedBy: req.user?.id,
      isVerified: false,
      uploadedAt: new Date(),
    };

    const company = await companyService.uploadDocument(
      req.params.companyId,
      document,
      req.user?.id?.toString() || ''
    );
    res.status(201).json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const company = await companyService.deleteDocument(
      req.params.companyId,
      req.params.documentId,
      req.user?.id?.toString() || ''
    );
    res.json({ success: true, data: company });
  } catch (error) {
    next(error);
  }
};
