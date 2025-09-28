import { Request, Response } from 'express';
import { NotFoundError, BadRequestError, NotAuthorizedError } from '@/errors';
import { Investor } from '@/models/investor.model';
import { Company } from '@/models/company.model';
import { User } from '@/models/user.model';
import { logger } from '@/utils/logger';

export const createInvestment = async (req: Request, res: Response) => {
  const { companyId, investmentAmount, ownershipPercentage } = req.body;
  const userId = req.user!.id;

  // Validate company exists and is active
  const company = await Company.findById(companyId);
  if (!company || !company.isActive) {
    throw new BadRequestError('Invalid or inactive company');
  }

  // Check if user already has an active investment in this company
  const existingInvestment = await Investor.findOne({
    user: userId,
    company: companyId,
    isActive: true
  });

  if (existingInvestment) {
    throw new BadRequestError('You already have an active investment in this company');
  }

  // Create investment
  const investor = Investor.build({
    user: userId,
    company: companyId,
    investmentAmount,
    ownershipPercentage,
    isActive: true,
    metadata: {
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  await investor.save();

  // Update company's total investment and ownership
  // This would be more complex in a real application with proper transaction handling
  company.totalInvestment = (company.totalInvestment || 0) + investmentAmount;
  await company.save();

  res.status(201).json({
    status: 'success',
    data: {
      investor
    }
  });
};

export const getInvestment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const investor = await Investor.findOne({
    _id: id,
    user: userId
  }).populate('company', 'name industry');

  if (!investor) {
    throw new NotFoundError('Investment not found');
  }

  res.json({
    status: 'success',
    data: {
      investor
    }
  });
};

export const getInvestments = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { isActive, limit = 10, page = 1 } = req.query;

  const query: any = { user: userId };
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  const options = {
    limit: parseInt(limit as string, 10),
    page: parseInt(page as string, 10),
    sort: { investedAt: -1 },
    populate: [
      { path: 'company', select: 'name industry logo' },
    ],
    select: '-__v'
  };

  // @ts-ignore - Missing type definitions for mongoose-paginate-v2
  const investments = await Investor.paginate(query, options);

  res.json({
    status: 'success',
    data: investments
  });
};

export const exitInvestment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const investor = await Investor.findOne({
    _id: id,
    user: userId,
    isActive: true
  });

  if (!investor) {
    throw new BadRequestError('Active investment not found');
  }

  investor.isActive = false;
  investor.exitedAt = new Date();
  await investor.save();

  // Update company's total investment (this is simplified)
  const company = await Company.findById(investor.company);
  if (company) {
    company.totalInvestment = Math.max(0, (company.totalInvestment || 0) - investor.investmentAmount);
    await company.save();
  }

  res.json({
    status: 'success',
    data: {
      investor
    }
  });
};

// Admin only endpoints
export const getAllInvestments = async (req: Request, res: Response) => {
  const { isActive, companyId, userId, limit = 20, page = 1 } = req.query;

  const query: any = {};
  
  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  if (companyId) {
    query.company = companyId;
  }

  if (userId) {
    query.user = userId;
  }

  const options = {
    limit: parseInt(limit as string, 10),
    page: parseInt(page as string, 10),
    sort: { investedAt: -1 },
    populate: [
      { path: 'user', select: 'email firstName lastName' },
      { path: 'company', select: 'name industry' }
    ],
    select: '-__v'
  };

  // @ts-ignore - Missing type definitions for mongoose-paginate-v2
  const investments = await Investor.paginate(query, options);

  res.json({
    status: 'success',
    data: investments
  });
};

export const getCompanyInvestors = async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const { isActive = 'true', limit = 20, page = 1 } = req.query;

  // Verify company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }

  const query: any = { 
    company: companyId,
    isActive: isActive === 'true'
  };

  const options = {
    limit: parseInt(limit as string, 10),
    page: parseInt(page as string, 10),
    sort: { investedAt: -1 },
    populate: [
      { path: 'user', select: 'email firstName lastName avatar' }
    ],
    select: '-__v'
  };

  // @ts-ignore - Missing type definitions for mongoose-paginate-v2
  const investors = await Investor.paginate(query, options);

  res.json({
    status: 'success',
    data: investors
  });
};
