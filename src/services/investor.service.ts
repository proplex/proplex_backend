import { Types } from 'mongoose';
import { Investor } from '@/models/investor.model';
import { ICompany } from '@/models/company.model';
import InvestorModel from '@/models/investor.model';
import Company from '@/models/company.model';
import { BaseService } from './base.service';
import { BadRequestError, NotFoundError } from '@/errors';

export class InvestorService extends BaseService<Investor> {
  constructor() {
    super(InvestorModel);
  }

  async createInvestment(
    userId: string | Types.ObjectId,
    companyId: string | Types.ObjectId,
    investmentAmount: number,
    ownershipPercentage: number,
    metadata: Record<string, any> = {}
  ) {
    // Convert string IDs to ObjectId if needed
    const companyObjectId = typeof companyId === 'string' ? new Types.ObjectId(companyId) : companyId;
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    // Check if company exists and is verified
    const company = await Company.findById(companyObjectId).exec();
    if (!company || company.status !== 'verified') {
      throw new BadRequestError('Invalid or unverified company');
    }

    // Check for existing active investment
    const existingInvestment = await this.findOne({
      user: userObjectId,
      company: companyObjectId,
      isActive: true
    });

    if (existingInvestment) {
      throw new BadRequestError('You already have an active investment in this company');
    }

    // Create investment
    const investment = await this.create({
      user: userObjectId,
      company: companyObjectId,
      investmentAmount,
      ownershipPercentage,
      isActive: true,
      metadata
    } as any); // Using type assertion to handle the Document type

    return investment.populate('company', 'name industry');
  }

  async exitInvestment(
    investmentId: string,
    userId: string | Types.ObjectId
  ) {
    // Convert string ID to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const investmentObjectId = typeof investmentId === 'string' ? new Types.ObjectId(investmentId) : investmentId;
    
    // Use the base class's findOne method instead of accessing the private model property
    const investment = await this.findOne({
      _id: investmentObjectId,
      user: userObjectId,
      isActive: true
    });

    if (!investment) {
      throw new NotFoundError('Active investment not found');
    }

    investment.isActive = false;
    investment.exitedAt = new Date();
    await investment.save();

    // Note: Company's total investment should be managed through a separate service
    // that handles the financial calculations and validations

    return investment.populate('company', 'name industry');
  }

  async getUserInvestments(
    userId: string | Types.ObjectId,
    options: {
      isActive?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { isActive, page = 1, limit = 10 } = options;
    
    const query: any = { user: userId };
    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    return this.paginate(query, {
      page,
      limit,
      sort: { investedAt: -1 },
      populate: 'company',
      select: 'name industry logo'
    });
  }

  async getCompanyInvestors(
    companyId: string | Types.ObjectId,
    options: {
      isActive?: boolean;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { isActive = true, page = 1, limit = 20 } = options;
    
    const query: any = { 
      company: companyId,
      isActive
    };

    return this.paginate(query, {
      page,
      limit,
      sort: { investedAt: -1 },
      populate: 'user',
      select: 'email firstName lastName avatar'
    });
  }
}

export const investorService = new InvestorService();
