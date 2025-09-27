import { Types, ClientSession, startSession, PopulateOptions, Document, Model, PopulatedDoc } from 'mongoose';
import { IUser } from '@/models/user.model';
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

// Extended interfaces for internal use with proper _id types
type WithId<T> = T & { _id: Types.ObjectId };

interface BankAccountWithId extends Omit<IBankAccount, 'documents'> {
  _id: Types.ObjectId;
  documents: IDocument[];
  updatedAt?: Date;
  updatedBy?: Types.ObjectId;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
}

interface LegalAdvisorWithId extends Omit<ILegalAdvisor, 'documents'> {
  _id: Types.ObjectId;
  documents: IDocument[];
  updatedAt?: Date;
  updatedBy?: Types.ObjectId;
}

interface BoardMemberWithId extends Omit<IBoardMember, 'documents' | '_id'> {
  _id: Types.ObjectId;
  documents: IDocument[];
  updatedAt?: Date;
  updatedBy?: Types.ObjectId;
  isDirector: boolean;
}

// Types
export interface CompanyInput {
  _id?: string | Types.ObjectId;
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
  parentCompany?: string | Types.ObjectId;
  
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
  bankAccounts?: Array<Omit<IBankAccount, 'documents'> & { documents?: Array<Omit<IDocument, '_id'>> }>;
  legalAdvisors?: Array<Omit<ILegalAdvisor, 'documents'> & { documents?: Array<Omit<IDocument, '_id'>> }>;
  boardMembers?: Array<Omit<IBoardMember, 'documents'> & { documents?: Array<Omit<IDocument, '_id'>> }>;
  documents?: Array<Omit<IDocument, '_id'>>;
}

// Helper function to safely convert string to ObjectId
const toObjectId = (id: string | Types.ObjectId | undefined): Types.ObjectId | undefined => {
  if (!id) return undefined;
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
};

// Helper function to transform input data
interface TransformedCompany extends Omit<Partial<ICompany>, 'bankAccounts' | 'legalAdvisors' | 'boardMembers' | 'documents'> {
  bankAccounts?: BankAccountWithId[];
  legalAdvisors?: LegalAdvisorWithId[];
  boardMembers?: BoardMemberWithId[];
  documents?: IDocument[];
}

const transformCompanyInput = (data: Partial<CompanyInput>, userId: string): TransformedCompany => {
  const transformed: TransformedCompany = {};
  const userIdObj = new Types.ObjectId(userId);
  
  // Copy all properties except the ones we need to handle specially
  const { 
    parentCompany, 
    verifiedBy, 
    bankAccounts, 
    legalAdvisors, 
    boardMembers, 
    documents: topLevelDocs,
    _id,
    ...restData 
  } = data;
  
  Object.assign(transformed, restData);
  
  // Handle special fields
  if (parentCompany) {
    transformed.parentCompany = toObjectId(parentCompany);
  }
  
  if (verifiedBy) {
    transformed.verifiedBy = toObjectId(verifiedBy);
  }
  
  // Set createdBy/updatedBy
  if (!_id) {
    transformed.createdBy = userIdObj;
  } else {
    transformed.updatedBy = userIdObj;
  }
  
  // Helper function to transform documents array
  const transformDocuments = (docs: Array<Omit<IDocument, '_id'>> | undefined): IDocument[] => 
    docs?.map(doc => ({
      ...doc,
      _id: new Types.ObjectId(),
      uploadedBy: toObjectId(doc.uploadedBy) || userIdObj,
      uploadedAt: doc.uploadedAt || new Date()
    })) || [];
  
  // Handle bank accounts
  if (bankAccounts) {
    transformed.bankAccounts = bankAccounts.map(account => {
      const { documents, ...accountData } = account;
      const bankAccount: BankAccountWithId = {
        ...accountData,
        _id: new Types.ObjectId(),
        isPrimary: accountData.isPrimary || false,
        isVerified: accountData.isVerified || false,
        verifiedAt: accountData.isVerified ? new Date() : undefined,
        verifiedBy: accountData.isVerified ? toObjectId(accountData.verifiedBy as any) : undefined,
        documents: transformDocuments(documents) as IDocument[]
      };
      return bankAccount;
    });
  }
  
  // Handle legal advisors
  if (legalAdvisors) {
    transformed.legalAdvisors = legalAdvisors.map(advisor => {
      const { documents, ...advisorData } = advisor;
      const legalAdvisor: LegalAdvisorWithId = {
        ...advisorData,
        _id: new Types.ObjectId(),
        isPrimary: advisorData.isPrimary || false,
        documents: transformDocuments(documents) as IDocument[]
      };
      return legalAdvisor;
    });
  }
  
  // Handle board members
  if (boardMembers) {
    transformed.boardMembers = boardMembers.map(member => {
      const { documents, ...memberData } = member;
      const boardMember: BoardMemberWithId = {
        ...memberData,
        _id: new Types.ObjectId(),
        isDirector: memberData.isDirector || false,
        documents: transformDocuments(documents) as IDocument[]
      };
      return boardMember;
    });
  }
  
  // Handle top-level documents
  if (topLevelDocs) {
    transformed.documents = transformDocuments(topLevelDocs) as IDocument[];
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
  const populateOptions: PopulateOptions[] = [];
  
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
  const populateOptions: PopulateOptions[] = [];
  
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
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError('Invalid company ID');
    }

    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Validate required fields
    if (!data.accountNumber || !data.bankName || !data.ifscCode) {
      throw new BadRequestError('Account number, bank name, and IFSC code are required');
    }

    // Check for duplicate account number
    const existingAccount = company.bankAccounts.find(
      acc => acc.accountNumber === data.accountNumber
    );
    
    if (existingAccount) {
      throw new BadRequestError('Bank account with this account number already exists');
    }

    const newAccount: BankAccountWithId = {
      ...data,
      _id: new Types.ObjectId(),
      isPrimary: false,
      isVerified: false,
      verifiedAt: undefined,
      verifiedBy: undefined,
      documents: data.documents?.map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: toObjectId(doc.uploadedBy as any) || new Types.ObjectId(userId),
        uploadedAt: doc.uploadedAt || new Date()
      })) || []
    } as unknown as BankAccountWithId;
  
    company.bankAccounts.push(newAccount);

    // If this is the first bank account, set it as primary
    if (company.bankAccounts.length === 1) {
      newAccount.isPrimary = true;
    }

    company.updatedBy = new Types.ObjectId(userId);
    await company.save({ session });
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
 * Update a bank account
 */
export const updateBankAccount = async (
  companyId: string,
  accountId: string,
  data: Partial<Omit<IBankAccount, 'createdAt' | 'updatedAt' | '_id'>>,
  userId: string
): Promise<ICompany | null> => {
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(accountId)) {
      throw new BadRequestError('Invalid company ID or account ID');
    }

    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const accountIndex = company.bankAccounts.findIndex(acc => acc._id?.toString() === accountId);
    if (accountIndex === -1) {
      throw new NotFoundError('Bank account not found');
    }

    // Prevent updating verified status directly (use verifyBankAccount instead)
    if ('isVerified' in data) {
      delete data.isVerified;
    }
    if ('verifiedAt' in data) {
      delete data.verifiedAt;
    }
    if ('verifiedBy' in data) {
      delete data.verifiedBy;
    }

    // Get the current account and create a new object with the updated fields
    const currentAccount = company.bankAccounts[accountIndex];
    const updatedAccount: IBankAccount = {
      ...currentAccount,
      ...data,
      // Remove any undefined values to prevent overriding with undefined
      ...Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      )
    };
    
    // Ensure we have the required fields with proper types
    updatedAccount.isPrimary = updatedAccount.isPrimary ?? false;
    updatedAccount.isVerified = updatedAccount.isVerified ?? false;

    // If this account is set as primary, update other accounts
    if (data.isPrimary === true) {
      company.bankAccounts = company.bankAccounts.map((acc, idx) => {
        if (idx === accountIndex) {
          return { ...acc, isPrimary: true };
        }
        return { ...acc, isPrimary: false };
      });
    } else {
      // If no accounts are primary, make this one primary
      const hasPrimary = company.bankAccounts.some((acc, idx) => 
        acc.isPrimary && idx !== accountIndex
      );
      
      if (!hasPrimary) {
        updatedAccount.isPrimary = true;
      }
      
      company.bankAccounts[accountIndex] = updatedAccount;
    }

    company.updatedBy = new Types.ObjectId(userId);
    await company.save({ session });
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
 * Add a board member to a company
 */
export const addBoardMember = async (
  companyId: string,
  data: Omit<IBoardMember, 'createdAt' | 'updatedAt' | '_id'>,
  userId: string
): Promise<ICompany | null> => {
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId)) {
      throw new BadRequestError('Invalid company ID');
    }

    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Validate required fields
    if (!data.name || !data.email || !data.phone || !data.designation || !data.address) {
      throw new BadRequestError('Name, email, phone, designation, and address are required');
    }

    // Check for duplicate email
    const emailExists = company.boardMembers.some(
      member => member.email.toLowerCase() === data.email.toLowerCase()
    );

    if (emailExists) {
      throw new BadRequestError('A board member with this email already exists');
    }

    const newMember: BoardMemberWithId = {
      ...data,
      _id: new Types.ObjectId(),
      isDirector: data.isDirector || false,
      documents: (data.documents || []).map(doc => ({
        ...doc,
        _id: new Types.ObjectId(),
        uploadedBy: toObjectId(doc.uploadedBy as any) || new Types.ObjectId(userId),
        uploadedAt: doc.uploadedAt || new Date()
      }))
    } as unknown as BoardMemberWithId;
    
    company.boardMembers.push(newMember);
    company.updatedBy = new Types.ObjectId(userId);
    await company.save({ session });
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
 * Update a board member
 */
export const updateBoardMember = async (
  companyId: string,
  memberId: string,
  data: Partial<Omit<IBoardMember, '_id'>>,
  userId: string
): Promise<ICompany | null> => {
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(memberId)) {
      throw new BadRequestError('Invalid company or member ID');
    }

    // Don't include _id in update data
    const updateData = { ...data };
    if ('_id' in updateData) {
      delete updateData._id;
    }
    
    // Prepare the update object
    const update: Record<string, any> = {
      'boardMembers.$.updatedAt': new Date(),
      'boardMembers.$.updatedBy': new Types.ObjectId(userId)
    };

    // Add only the fields that are being updated
    Object.entries(updateData).forEach(([key, value]) => {
      if (value !== undefined) {
        update[`boardMembers.$.${key}`] = value;
      }
    });

    // Check for duplicate email if email is being updated
    if (updateData.email) {
      const company = await Company.findById(companyId).session(session);
      if (!company) {
        throw new NotFoundError('Company not found');
      }

      const emailExists = company.boardMembers.some(
        member => 
          member.email?.toLowerCase() === updateData.email?.toLowerCase() && 
          member._id?.toString() !== memberId
      );

      if (emailExists) {
        throw new BadRequestError('A board member with this email already exists');
      }
    }

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: companyId, 'boardMembers._id': memberId },
      { $set: update },
      { new: true, runValidators: true, session }
    )
    .populate('boardMembers.createdBy', 'name email')
    .populate('boardMembers.updatedBy', 'name email')
    .session(session);

    if (!updatedCompany) {
      throw new NotFoundError('Company or board member not found');
    }

    await session.commitTransaction();
    return updatedCompany;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
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
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(accountId)) {
      throw new BadRequestError('Invalid company or account ID');
    }

    // Verify the company and account exist
    const company = await Company.findById(companyId).session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    const accountIndex = company.bankAccounts.findIndex(
      acc => acc._id?.toString() === accountId
    );

    if (accountIndex === -1) {
      throw new NotFoundError('Bank account not found');
    }

    // If the account is already in the desired state, return early
    if (company.bankAccounts[accountIndex].isVerified === isVerified) {
      return company;
    }

    // Prepare the update object with explicit types
    const update: {
      $set: {
        'bankAccounts.$.isVerified': boolean;
        'bankAccounts.$.verifiedAt': Date | null;
        'bankAccounts.$.verifiedBy': Types.ObjectId | null;
        'bankAccounts.$.updatedAt': Date;
        'bankAccounts.$.updatedBy': Types.ObjectId;
        updatedAt: Date;
        updatedBy: Types.ObjectId;
        'bankAccounts.$.isPrimary'?: boolean;
      };
    } = {
      $set: {
        'bankAccounts.$.isVerified': isVerified,
        'bankAccounts.$.verifiedAt': isVerified ? new Date() : null,
        'bankAccounts.$.verifiedBy': isVerified ? new Types.ObjectId(verifiedBy) : null,
        'bankAccounts.$.updatedAt': new Date(),
        'bankAccounts.$.updatedBy': new Types.ObjectId(verifiedBy),
        updatedAt: new Date(),
        updatedBy: new Types.ObjectId(verifiedBy)
      }
    };

    // If verifying, ensure there's at least one primary account
    if (isVerified) {
      const hasPrimary = company.bankAccounts.some(
        (acc, idx) => acc.isPrimary && idx !== accountIndex
      );

      if (!hasPrimary) {
        update.$set['bankAccounts.$.isPrimary'] = true;
      }
    }

    const updatedCompany = await Company.findOneAndUpdate(
      { _id: companyId, 'bankAccounts._id': accountId },
      update,
      { new: true, runValidators: true, session }
    );

    if (!updatedCompany) {
      throw new Error('Failed to update bank account');
    }

    await session.commitTransaction();
    return updatedCompany;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
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
  advisorId: string,
  userId: string
): Promise<ICompany | null> => {
  const session = await startSession();
  session.startTransaction();

  try {
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(advisorId)) {
      throw new BadRequestError('Invalid company or advisor ID');
    }

    // Check if company exists
    const company = await Company.findById(companyId)
      .populate<{ legalAdvisors: ILegalAdvisor[] }>('legalAdvisors')
      .session(session);
    if (!company) {
      throw new NotFoundError('Company not found');
    }

    // Check if advisor exists
    const legalAdvisor = company.legalAdvisors.find(adv => adv._id?.toString() === advisorId);
    if (!legalAdvisor?._id) {
      throw new NotFoundError('Legal advisor not found');
    }

    // Check if this is the only advisor (prevent removing the last advisor)
    if (company.legalAdvisors.length <= 1) {
      throw new BadRequestError('Cannot remove the only legal advisor');
    }

    // Remove the advisor
    const update = {
      $pull: { legalAdvisors: { _id: advisorId } },
      $set: { 
        updatedBy: new Types.ObjectId(userId),
        updatedAt: new Date()
      }
    };

    const updatedCompany = await Company.findByIdAndUpdate(
      companyId,
      update,
      { new: true, session }
    );

    if (!updatedCompany) {
      throw new Error('Failed to remove legal advisor');
    }

    await session.commitTransaction();
    return updatedCompany;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
  
  // Populate the updated company with board members' createdBy and updatedBy
  const populatedCompany = await Company.findById(companyId)
    .populate('boardMembers.createdBy', 'name email')
    .populate('boardMembers.updatedBy', 'name email')
    .lean();
    
  return populatedCompany;
};

/**
 * Upload a document for a company
 */
export const uploadDocument = async (
  companyId: string,
  document: Omit<IDocument, '_id' | 'uploadedAt' | 'uploadedBy'>,
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
  
  // Add the document to the company's documents array
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    {
      $push: {
        documents: {
          ...document,
          _id: new Types.ObjectId(),
          uploadedAt: new Date(),
          uploadedBy: new Types.ObjectId(userId)
        }
      }
    },
    { new: true }
  );
  
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
    throw new BadRequestError('Invalid company ID or document ID');
  }
  
  // Check if company exists
  const company = await Company.findById(companyId);
  if (!company) {
    throw new NotFoundError('Company not found');
  }
  
  // Check if document exists
  const companyDoc = company as unknown as (ICompany & { documents?: Array<IDocument & { _id?: Types.ObjectId }> });
  const documentIndex = companyDoc.documents?.findIndex((doc: IDocument & { _id?: Types.ObjectId }) => doc._id?.toString() === documentId) ?? -1;
  if (documentIndex === -1) {
    throw new NotFoundError('Document not found');
  }
  
  // Here you might want to delete the actual file from storage
  // before removing the reference from the database
  
  // Use $pull to remove the document from the array
  const updatedCompany = await Company.findByIdAndUpdate(
    companyId,
    { 
      $pull: { 
        documents: { _id: new Types.ObjectId(documentId) } 
      },
      $set: { updatedAt: new Date(), updatedBy: new Types.ObjectId(userId) }
    },
    { new: true }
  );
  
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
