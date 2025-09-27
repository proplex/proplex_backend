import { Types, ClientSession, startSession } from 'mongoose';
import Company, { 
  ICompany, 
  IBankAccount, 
  ILegalAdvisor, 
  IBoardMember, 
  IDocument, 
  CompanyType, 
  SpvType, 
  BankAccountType,
  CompanyType as CompanyTypeArray,
  SpvType as SpvTypeArray
} from '@/models/company.model';
import { getPaginationOptions, buildSortOptions } from '@/utils/query-utils';
import { NotFoundError } from '@/errors/not-found-error';
import { BadRequestError } from '@/errors/bad-request-error';
import { ValidationError } from '@/errors/validation-error';
import { AppError } from '@/errors/app-error';

// Types
export interface CompanyInput {
  _id?: string;
  // Basic Information
  name: string;
  industry: string;
  incorporationType: CompanyType;
  jurisdiction: string;
  cinNumber?: string;
  panNumber?: string;
  tanNumber?: string;
  gstNumber?: string;
  registrationNumber?: string;
  registrationDate?: Date;
  
  // Contact Information
  email: string;
  phone: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  
  // SPV Specific
  isSpv?: boolean;
  spvType?: SpvType;
  parentCompany?: string;
  
  // Documents
  certificateOfIncorporation?: string;
  moaDocument?: string;
  aoaDocument?: string;
  llpAgreement?: string;
  otherDocuments?: Array<{
    name: string;
    url: string;
    uploadedAt?: Date;
  }>;
  
  // Status
  status?: 'draft' | 'pending_verification' | 'verified' | 'rejected' | 'suspended';
  rejectionReason?: string;
  
  // Additional fields from the model
  logo?: string;
  description?: string;
  taxId?: string;
  vatNumber?: string;
  fiscalYearEnd?: Date;
  financialYearStart?: Date;
  financialYearEnd?: Date;
  timezone?: string;
  currency?: string;
  language?: string;
  isActive?: boolean;
  isVerified?: boolean;
  verifiedAt?: Date;
  verifiedBy?: string | Types.ObjectId;
  notes?: string;
  tags?: string[];
  bankAccounts?: Array<Omit<IBankAccount, 'createdAt' | 'updatedAt' | '_id'>>;
  legalAdvisors?: Array<Omit<ILegalAdvisor, 'createdAt' | 'updatedAt' | '_id'>>;
  boardMembers?: Array<Omit<IBoardMember, 'createdAt' | 'updatedAt' | '_id'>>;
  documents?: Array<Omit<IDocument, '_id'>>;
}

// Helper function to safely convert string to ObjectId
const toObjectId = (id: string | Types.ObjectId | undefined): Types.ObjectId | undefined => {
  if (!id) return undefined;
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
};

// Helper function to transform input data
const transformCompanyInput = (data: Partial<CompanyInput>, userId: string): Partial<ICompany> => {
  const transformed: Partial<ICompany> = {};
  const userIdObj = new Types.ObjectId(userId);
  
  // Copy all properties except the ones we need to handle specially
  Object.keys(data).forEach(key => {
    if (key !== 'parentCompany' && key !== 'verifiedBy' && key !== 'bankAccounts' && 
        key !== 'legalAdvisors' && key !== 'boardMembers' && key !== 'documents') {
      (transformed as any)[key] = (data as any)[key];
    }
  });
  
  // Handle special fields
  if (data.parentCompany) {
    transformed.parentCompany = toObjectId(data.parentCompany);
  }
  
  if (data.verifiedBy) {
    transformed.verifiedBy = toObjectId(data.verifiedBy);
  }
  
  // Set createdBy/updatedBy
  if (!data._id) {
    transformed.createdBy = userIdObj;
  } else {
    transformed.updatedBy = userIdObj;
  }
  
  // Helper function to transform documents array
  const transformDocuments = (docs: Array<Omit<IDocument, '_id'>> | undefined) => 
    docs?.map(doc => ({
      ...doc,
      _id: new Types.ObjectId(),
      uploadedBy: toObjectId(doc.uploadedBy) || userIdObj,
      uploadedAt: doc.uploadedAt || new Date()
    }));
  
  // Handle bank accounts
  if (data.bankAccounts) {
    transformed.bankAccounts = data.bankAccounts.map(account => ({
      ...account,
      _id: new Types.ObjectId(),
      verifiedBy: toObjectId(account.verifiedBy as any),
      documents: transformDocuments(account.documents as any) || []
    } as any)); // Use type assertion here
  }
  
  // Handle legal advisors
  if (data.legalAdvisors) {
    transformed.legalAdvisors = data.legalAdvisors.map(advisor => ({
      ...advisor,
      _id: new Types.ObjectId(),
      documents: transformDocuments(advisor.documents as any) || []
    } as any)); // Use type assertion here
  }
  
  // Handle board members
  if (data.boardMembers) {
    transformed.boardMembers = data.boardMembers.map(member => ({
      ...member,
      _id: new Types.ObjectId(),
      documents: transformDocuments(member.documents as any) || []
    } as any)); // Use type assertion here
  }
  
  // Handle top-level documents
  if (data.documents) {
    transformed.documents = transformDocuments(data.documents);
  }
  
  return transformed;
};

/**
 * Create a new company
 */
export const createCompany = async (data: CompanyInput, userId: string): Promise<ICompany> => {
  const session = await startSession();
  session.startTransaction();
  
  try {
    // Validate input data
    if (!data.name || !data.industry || !data.incorporationType || !data.jurisdiction) {
      throw new Error('Missing required fields');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if company with the same name or registration number already exists
    const existingCompany = await Company.findOne(
      {
        $or: [
          { name: data.name },
          { registrationNumber: data.registrationNumber },
          { cinNumber: data.cinNumber },
          { panNumber: data.panNumber },
          { gstNumber: data.gstNumber },
        ],
      },
      null,
      { session }
    );

    if (existingCompany) {
      throw new BadRequestError('A company with the same details already exists');
    }

    const companyData = transformCompanyInput(data, userId);
    const [company] = await Company.create([companyData], { session });
    
    // Populate the created company for the response
    const populatedCompany = await Company.findById(company._id)
      .populate('parentCompany', 'name email')
      .populate('createdBy', 'name email')
      .session(session)
      .lean();

    await session.commitTransaction();
    return populatedCompany as ICompany;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Get companies with pagination and filtering
 */
export const getCompanies = async ({
  page = 1,
  limit = 10,
  search,
  status,
  isSpv,
  parentCompany,
  createdBy,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  include = [],
}: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string | string[];
  isSpv?: boolean;
  parentCompany?: string;
  createdBy?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  include?: string[];
} = {}): Promise<{
  data: ICompany[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> => {
  const { skip, ...pagination } = getPaginationOptions(page, limit);
  const sort = buildSortOptions(sortBy, sortOrder);
  
  const query: any = {};
  
  // Text search across multiple fields
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { cinNumber: { $regex: search, $options: 'i' } },
      { panNumber: { $regex: search, $options: 'i' } },
      { gstNumber: { $regex: search, $options: 'i' } },
    ];
  }
  
  // Status filter (can be single value or array)
  if (status) {
    if (Array.isArray(status)) {
      query.status = { $in: status };
    } else {
      query.status = status;
    }
  }
  
  // SPV filter
  if (typeof isSpv !== 'undefined') {
    query.isSpv = isSpv;
  }
  
  // Parent company filter
  if (parentCompany) {
    query.parentCompany = new Types.ObjectId(parentCompany);
  }
  
  // Created by filter
  if (createdBy) {
    query.createdBy = new Types.ObjectId(createdBy);
  }
  
  // Build the query
  const queryBuilder = Company.find(query).sort(sort).skip(skip).limit(pagination.limit);
  
  // Add population based on include parameter
  const populateOptions = [];
  
  if (include.includes('parentCompany') || include.length === 0) {
    populateOptions.push({ path: 'parentCompany', select: 'name email phone' });
  }
  
  if (include.includes('createdBy') || include.length === 0) {
    populateOptions.push({ path: 'createdBy', select: 'name email' });
  }
  
  if (include.includes('verifiedBy')) {
    populateOptions.push({ path: 'verifiedBy', select: 'name email' });
  }
  
  if (populateOptions.length > 0) {
    queryBuilder.populate(populateOptions);
  }
  
  // Execute queries in parallel
  const [total, companies] = await Promise.all([
    Company.countDocuments(query),
    queryBuilder.lean()
  ]);
  
  return {
    data: companies,
    total,
    ...pagination,
    totalPages: Math.ceil(total / pagination.limit),
  };
};

/**
 * Get company by ID with optional population
 */
export const getCompanyById = async (
  id: string,
  populate: string[] = ['parentCompany', 'createdBy', 'verifiedBy']
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  let query = Company.findById(id);
  
  // Add population based on requested fields
  const populateOptions = [];
  
  if (populate.includes('parentCompany')) {
    populateOptions.push({ path: 'parentCompany', select: 'name email phone' });
  }
  
  if (populate.includes('createdBy')) {
    populateOptions.push({ path: 'createdBy', select: 'name email' });
  }
  
  if (populate.includes('verifiedBy')) {
    populateOptions.push({ path: 'verifiedBy', select: 'name email' });
  }
  
  if (populateOptions.length > 0) {
    query = query.populate(populateOptions);
  }
  
  const company = await query.lean();
  
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  return company;
};

/**
 * Update a company
 */
export const updateCompany = async (
  id: string, 
  data: Partial<CompanyInput>,
  userId: string
): Promise<ICompany | null> => {
  const session = await startSession();
  session.startTransaction();
  
  try {
    const company = await Company.findById(id).session(session);
    
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    
    // Validate SPV type if provided
    if (data.isSpv && data.spvType && !SpvTypeArray.includes(data.spvType as any)) {
      throw new BadRequestError(`Invalid SPV type. Must be one of: ${SpvTypeArray.join(', ')}`);
    }
    
    // Validate company type if provided
    if (data.incorporationType && !CompanyTypeArray.includes(data.incorporationType as any)) {
      throw new BadRequestError(`Invalid company type. Must be one of: ${CompanyTypeArray.join(', ')}`);
    }
    
    const updates = transformCompanyInput(data, userId);
    Object.assign(company, updates);
    
    await company.save({ session });
    
    // Fetch the updated company with populated fields
    const updatedCompany = await Company.findById(id)
      .populate('parentCompany', 'name email')
      .populate('updatedBy', 'name email')
      .session(session)
      .lean();

    await session.commitTransaction();
    return updatedCompany as ICompany;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Delete a company (soft delete)
 */
export const deleteCompany = async (id: string, userId: string): Promise<boolean> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid company ID');
  }

  const session = await startSession();
  session.startTransaction();
  
  try {
    // Check if company exists and has no dependencies
    const company = await Company.findById(id).session(session);
    
    if (!company) {
      throw new NotFoundError('Company not found');
    }
    
    // Check for dependencies here if needed
    // For example: const hasDependencies = await checkForDependencies(company._id);
    
    // Update company with deletion details
    const updateData: Partial<ICompany> = {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: new Types.ObjectId(userId)
    };
    
    await Company.findByIdAndUpdate(
      id,
      { $set: updateData },
      { session, new: true }
    );
    
    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Update company status
 */
export const updateCompanyStatus = async (
  id: string,
  status: 'pending_verification' | 'verified' | 'rejected' | 'suspended',
  verifiedBy: string,
  rejectionReason?: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  // Check if company exists
  const company = await Company.findById(id);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  const update: any = { 
    status,
    ...(status === 'rejected' && { rejectionReason }),
    verifiedBy: new Types.ObjectId(verifiedBy),
    verifiedAt: new Date(),
  };
  
  const session = await startSession();
  session.startTransaction();
  
  try {
    const company = await Company.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true, session }
    )
      .populate('verifiedBy', 'name email')
      .session(session)
      .lean();

    if (!company) {
      throw new NotFoundError('Company not found');
    }

    await session.commitTransaction();
    return company;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Add a bank account to a company
 */
export const addBankAccount = async (
  companyId: string,
  data: Omit<IBankAccount, 'createdAt' | 'updatedAt' | '_id'>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const bankAccount: any = {
      ...data,
      _id: new Types.ObjectId(),
      verifiedBy: data.verifiedBy ? new Types.ObjectId(data.verifiedBy as string) : undefined,
      documents: (data.documents || []).map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: doc.uploadedBy ? new Types.ObjectId(doc.uploadedBy as string) : new Types.ObjectId(userId),
        uploadedAt: new Date()
      }))
    };

    company.bankAccounts.push(bankAccount);
    await company.save({ session });
    await session.commitTransaction();

    return company.toObject({ virtuals: true });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  const session = await startSession();
  session.startTransaction();

  try {
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const bankAccount: IBankAccount = {
      ...data,
      _id: new Types.ObjectId(),
      verifiedBy: data.verifiedBy ? new Types.ObjectId(data.verifiedBy) : undefined,
      documents: data.documents?.map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: doc.uploadedBy || new Types.ObjectId(userId),
        uploadedAt: doc.uploadedAt || new Date()
      })) || []
    };

    company.bankAccounts.push(bankAccount);
    await company.save({ session });
    await session.commitTransaction();

    return company.toObject({ virtuals: true });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if account number already exists for this company
  const existingAccount = company.bankAccounts?.find(
    acc => acc.accountNumber === data.accountNumber
  );
  
  if (existingAccount) {
    throw new BadRequestError('Bank account with this account number already exists');
  }
  
  const newAccount: IBankAccount = {
    _id: new Types.ObjectId(),
    ...data,
    isVerified: false,
    verifiedAt: undefined,
    verifiedBy: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new Types.ObjectId(userId),
  };
  
  // If this is the first account, set it as primary
  if (!company.bankAccounts || company.bankAccounts.length === 0) {
    newAccount.isPrimary = true;
  }
  
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { $push: { bankAccounts: newAccount } },
    { new: true, runValidators: true }
  )
  .populate('bankAccounts.verifiedBy', 'name email')
  .populate('bankAccounts.createdBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Update an existing bank account
 */
export const updateBankAccount = async (
  companyId: string,
  accountId: string,
  data: Partial<Omit<IBankAccount, 'createdAt' | 'updatedAt' | '_id'>>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(accountId)) {
    throw new BadRequestError('Invalid company or account ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if account exists
  const accountIndex = company.bankAccounts?.findIndex(
    acc => acc._id.toString() === accountId
  );
  
  if (accountIndex === -1) {
    throw new NotFoundError('Bank account not found');
  }
  
  // Prevent updating certain fields directly
  const { _id, isVerified, verifiedAt, verifiedBy, ...updateData } = data;
  
  // If updating to primary, unset primary flag from other accounts
  if (updateData.isPrimary) {
    await Company.updateOne(
      { _id: companyId, 'bankAccounts._id': { $ne: accountId } },
      { $set: { 'bankAccounts.$.isPrimary': false } }
    );
  }
  
  // Build the update object
  const update: Record<string, any> = {
    'bankAccounts.$.updatedAt': new Date(),
    'bankAccounts.$.updatedBy': new Types.ObjectId(userId),
  };
  
  // Add only the fields that are being updated
  Object.entries(updateData).forEach(([key, value]) => {
    if (value !== undefined) {
      update[`bankAccounts.$.${key}`] = value;
    }
  });
  
  const updatedCompany = await Company.findOneAndUpdate(
    { _id: companyId, 'bankAccounts._id': accountId },
    { $set: update },
    { new: true, runValidators: true }
  )
  .populate('bankAccounts.verifiedBy', 'name email')
  .populate('bankAccounts.createdBy', 'name email')
  .populate('bankAccounts.updatedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Add a legal advisor to a company
 */
export const addLegalAdvisor = async (
  companyId: string,
  data: Omit<ILegalAdvisor, 'createdAt' | 'updatedAt' | '_id'>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const legalAdvisor: any = {
      ...data,
      _id: new Types.ObjectId(),
      documents: (data.documents || []).map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: doc.uploadedBy ? new Types.ObjectId(doc.uploadedBy as string) : new Types.ObjectId(userId),
        uploadedAt: new Date()
      }))
    };

    company.legalAdvisors.push(legalAdvisor);
    await company.save({ session });
    await session.commitTransaction();

    return company.toObject({ virtuals: true });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

/**
 * Add a board member to a company
 */
export const addBoardMember = async (
  companyId: string,
  data: Omit<IBoardMember, 'createdAt' | 'updatedAt' | '_id'>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }

  const session = await startSession();
  session.startTransaction();

  try {
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const boardMember: any = {
      ...data,
      _id: new Types.ObjectId(),
      documents: (data.documents || []).map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: doc.uploadedBy ? new Types.ObjectId(doc.uploadedBy as string) : new Types.ObjectId(userId),
        uploadedAt: new Date()
      }))
    };

    company.boardMembers.push(boardMember);
    await company.save({ session });
    await session.commitTransaction();

    return company.toObject({ virtuals: true });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  const session = await startSession();
  session.startTransaction();

  try {
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const boardMember: IBoardMember = {
      ...data,
      _id: new Types.ObjectId(),
      documents: data.documents?.map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: doc.uploadedBy || new Types.ObjectId(userId),
        uploadedAt: doc.uploadedAt || new Date()
      })) || []
    };

    company.boardMembers.push(boardMember);
    await company.save({ session });
    await session.commitTransaction();

    return company.toObject({ virtuals: true });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  const newMember: IBoardMember = {
    _id: new Types.ObjectId(),
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: new Types.ObjectId(userId),
  };
  
  // If this is the first member, set as primary
  if (!company.boardMembers || company.boardMembers.length === 0) {
    newMember.isPrimary = true;
  }
  
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { $push: { boardMembers: newMember } },
    { new: true, runValidators: true }
  )
  .populate('boardMembers.createdBy', 'name email')
  .populate('boardMembers.updatedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Update a board member
 */
export const updateBoardMember = async (
  companyId: string,
  memberId: string,
  data: Partial<IBoardMember>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(memberId)) {
    throw new BadRequestError('Invalid company or member ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if member exists
  const memberIndex = company.boardMembers?.findIndex(
    m => m._id.toString() === memberId
  );
  
  if (memberIndex === -1) {
    throw new NotFoundError('Board member not found');
  }
  
  // If setting as primary, unset primary flag from other members
  if (data.isPrimary) {
    await Company.updateOne(
      { _id: companyId, 'boardMembers._id': { $ne: memberId } },
      { $set: { 'boardMembers.$.isPrimary': false } }
    );
  }
  
  // Build the update object
  const update: Record<string, any> = {
    'boardMembers.$.updatedAt': new Date(),
    'boardMembers.$.updatedBy': new Types.ObjectId(userId),
  };
  
  // Add only the fields that are being updated
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && key !== '_id') {
      update[`boardMembers.$.${key}`] = value;
    }
  });
  
  const updatedCompany = await Company.findOneAndUpdate(
    { _id: companyId, 'boardMembers._id': memberId },
    { $set: update },
    { new: true, runValidators: true }
  )
  .populate('boardMembers.createdBy', 'name email')
  .populate('boardMembers.updatedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Remove a bank account from a company
 */
export const removeBankAccount = async (
  companyId: string,
  accountId: string,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(accountId)) {
    throw new BadRequestError('Invalid company or account ID');
  }

  const company = await Company.findByIdAndUpdate(
    companyId,
    {
      $pull: { bankAccounts: { _id: accountId } },
      $set: { updatedBy: userId, updatedAt: new Date() }
    },
    { new: true }
  );

  if (!company) {
    throw new NotFoundError('Company not found');
  }

  return company;
};

/**
 * Verify a bank account
 */
export const verifyBankAccount = async (
  companyId: string,
  accountId: string,
  isVerified: boolean,
  verifiedBy: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(accountId)) {
    throw new BadRequestError('Invalid company or account ID');
  }

  const company = await Company.findOneAndUpdate(
    { _id: companyId, 'bankAccounts._id': accountId },
    {
      $set: {
        'bankAccounts.$.isVerified': isVerified,
        'bankAccounts.$.verifiedAt': isVerified ? new Date() : null,
        'bankAccounts.$.verifiedBy': isVerified ? verifiedBy : null,
        'bankAccounts.$.updatedAt': new Date(),
        'bankAccounts.$.updatedBy': verifiedBy
      }
    },
    { new: true }
  );

  if (!company) {
    throw new NotFoundError('Company or bank account not found');
  }

  return company;
};

/**
 * Update a legal advisor
 */
export const updateLegalAdvisor = async (
  companyId: string,
  advisorId: string,
  data: Partial<ILegalAdvisor>,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(advisorId)) {
    throw new BadRequestError('Invalid company or advisor ID');
  }

  const updateData: any = { ...data };
  updateData.updatedAt = new Date();
  updateData.updatedBy = userId;

  const company = await Company.findOneAndUpdate(
    { _id: companyId, 'legalAdvisors._id': advisorId },
    { $set: { 'legalAdvisors.$': updateData } },
    { new: true }
  );

  if (!company) {
    throw new NotFoundError('Company or legal advisor not found');
  }

  return company;
};

/**
 * Remove a legal advisor from a company
 */
export const removeLegalAdvisor = async (
  companyId: string,
  memberId: string,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(memberId)) {
    throw new BadRequestError('Invalid company or member ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if member exists and is not primary
  const member = company.boardMembers?.find(
    m => m._id.toString() === memberId
  );
  
  if (!member) {
    throw new NotFoundError('Board member not found');
  }
  
  if (member.isPrimary) {
    throw new BadRequestError('Cannot delete primary board member');
  }
  
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { 
      $pull: { boardMembers: { _id: memberId } },
      $set: { updatedBy: new Types.ObjectId(userId) }
    },
    { new: true }
  )
  .populate('boardMembers.createdBy', 'name email')
  .populate('boardMembers.updatedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Upload a document for a company
 */
export const uploadDocument = async (
  companyId: string,
  document: IDocument,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  const newDocument: IDocument = {
    _id: new Types.ObjectId(),
    ...document,
    uploadedAt: new Date(),
    uploadedBy: new Types.ObjectId(userId),
  };
  
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { $push: { documents: newDocument } },
    { new: true, runValidators: true }
  )
  .populate('documents.uploadedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Delete a document from a company
 */
export const deleteDocument = async (
  companyId: string,
  documentId: string,
  userId: string
): Promise<ICompany | null> => {
  if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(documentId)) {
    throw new BadRequestError('Invalid company or document ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if document exists
  const document = company.documents?.find(doc => doc._id.toString() === documentId);
  if (!document) {
    throw new NotFoundError('Document not found');
  }
  
  // Here you might want to delete the actual file from storage
  // before removing the reference from the database
  
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { 
      $pull: { documents: { _id: documentId } },
      $set: { updatedBy: new Types.ObjectId(userId) }
    },
    { new: true }
  )
  .populate('documents.uploadedBy', 'name email')
  .lean();
  
  return updatedCompany;
};

/**
 * Get company statistics
 */
export const getCompanyStats = async (companyId: string): Promise<{
  totalAssets: number;
  activeAssets: number;
  totalInvestments: number;
  totalInvestors: number;
  documents: {
    total: number;
    byType: Array<{ _id: string; count: number }>;
  };
  bankAccounts: {
    total: number;
    verified: number;
    primary: number;
  };
  team: {
    legalAdvisors: number;
    boardMembers: number;
    executives: number;
  };
}> => {
  if (!Types.ObjectId.isValid(companyId)) {
    throw new BadRequestError('Invalid company ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // These would be replaced with actual queries to other collections
  // For now, we'll return mock data
  const [
    totalAssets,
    activeAssets,
    totalInvestments,
    totalInvestors,
    documentsByType,
  ] = await Promise.all([
    // Replace with actual queries
    Promise.resolve(0), // Total assets
    Promise.resolve(0), // Active assets
    Promise.resolve(0), // Total investments
    Promise.resolve(0), // Total investors
    Promise.resolve([]), // Documents by type
  ]);
  
  // Calculate document stats
  const totalDocuments = company.documents?.length || 0;
  
  // Calculate bank account stats
  const bankAccounts = {
    total: company.bankAccounts?.length || 0,
    verified: company.bankAccounts?.filter(acc => acc.isVerified).length || 0,
    primary: company.bankAccounts?.filter(acc => acc.isPrimary).length || 0,
  };
  
  // Calculate team stats
  const team = {
    legalAdvisors: company.legalAdvisors?.length || 0,
    boardMembers: company.boardMembers?.length || 0,
    executives: company.boardMembers?.filter(member => member.isExecutive).length || 0,
  };
  
  return {
    totalAssets,
    activeAssets,
    totalInvestments,
    totalInvestors,
    documents: {
      total: totalDocuments,
      byType: documentsByType,
    },
    bankAccounts,
    team,
  };
};
