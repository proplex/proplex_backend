import { Schema, model, Document, Types } from 'mongoose';

// Types for documents
export interface IDocument {
  _id?: Types.ObjectId;
  type: string;
  url: string;
  name?: string;
  uploadedAt?: Date;
  uploadedBy?: Types.ObjectId;
  description?: string;
  size?: number;
  mimeType?: string;
}

// Types for enums
export const CompanyType = ['private_limited', 'llp', 'llc', 'plc', 'other'] as const;
export type CompanyType = typeof CompanyType[number];

export const SpvType = ['asset_holding', 'project_specific', 'investment', 'joint_venture'] as const;
export type SpvType = typeof SpvType[number];

export const BankAccountType = ['savings', 'current', 'escrow'] as const;
export type BankAccountType = typeof BankAccountType[number];

// Interface for bank account
export interface IBankAccount {
  accountNumber: string;
  accountType: BankAccountType;
  bankName: string;
  branchName?: string;
  ifscCode: string;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  documents?: IDocument[];
}

// Interface for legal advisor
export interface ILegalAdvisor {
  name: string;
  email: string;
  phone: string;
  firmName: string;
  address: string;
  isPrimary: boolean;
  documents?: IDocument[];
}

// Interface for board member
export interface IBoardMember {
  name: string;
  email: string;
  phone: string;
  designation: string;
  isDirector: boolean;
  dinNumber?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  address: string;
  documents?: IDocument[];
}

// Main company interface
export interface ICompany extends Document {
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
  isSpv: boolean;
  spvType?: SpvType;
  parentCompany?: Types.ObjectId;
  
  // Documents
  certificateOfIncorporation?: string;
  moaDocument?: string;
  aoaDocument?: string;
  llpAgreement?: string;
  otherDocuments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  
  // Bank Accounts
  bankAccounts: IBankAccount[];
  
  // Legal Advisors
  legalAdvisors: ILegalAdvisor[];
  
  // Board Members
  boardMembers: IBoardMember[];
  
  // Status
  status: 'draft' | 'pending_verification' | 'verified' | 'rejected' | 'suspended';
  rejectionReason?: string;
  verifiedAt?: Date;
  verifiedBy?: Types.ObjectId;
  
  // System Fields
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Virtuals
  parentCompanyDetails?: any;
  createdByDetails?: any;
  verifiedByDetails?: any;
  isDeleted?: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
}

// Sub-schemas
const documentSchema = new Schema({
  type: { type: String, required: true },
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const bankAccountSchema = new Schema<IBankAccount>({
  accountNumber: { type: String, required: true },
  accountType: { type: String, enum: BankAccountType, required: true },
  bankName: { type: String, required: true },
  branchName: String,
  ifscCode: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  verifiedAt: Date,
  verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  documents: [documentSchema]
}, { _id: true });

const legalAdvisorSchema = new Schema<ILegalAdvisor>({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  firmName: { type: String, required: true },
  address: { type: String, required: true },
  isPrimary: { type: Boolean, default: false },
  documents: [documentSchema]
}, { _id: true });

const boardMemberSchema = new Schema<IBoardMember>({
  name: { type: String, required: true },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, required: true },
  designation: { type: String, required: true },
  isDirector: { type: Boolean, default: false },
  dinNumber: String,
  panNumber: String,
  aadhaarNumber: String,
  address: { type: String, required: true },
  documents: [documentSchema]
}, { _id: true });

// Main company schema
const companySchema = new Schema<ICompany>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },
    industry: {
      type: String,
      required: [true, 'Industry is required'],
    },
    incorporationType: {
      type: String,
      enum: CompanyType,
      required: [true, 'Incorporation type is required'],
    },
    jurisdiction: {
      type: String,
      required: [true, 'Jurisdiction is required'],
    },
    cinNumber: String,
    panNumber: String,
    tanNumber: String,
    gstNumber: String,
    registrationNumber: String,
    registrationDate: Date,
    
    // Contact Information
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    website: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      trim: true,
      match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'],
    },
    
    // SPV Specific
    isSpv: {
      type: Boolean,
      default: false,
    },
    spvType: {
      type: String,
      enum: SpvType,
      required: function() { return this.isSpv; },
    },
    parentCompany: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
    },
    
    // Documents
    certificateOfIncorporation: String,
    moaDocument: String,
    aoaDocument: String,
    llpAgreement: String,
    otherDocuments: [{
      name: { type: String, required: true },
      url: { type: String, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }],
    
    // Bank Accounts
    bankAccounts: [bankAccountSchema],
    
    // Legal Advisors
    legalAdvisors: [legalAdvisorSchema],
    
    // Board Members
    boardMembers: [boardMemberSchema],
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'pending_verification', 'verified', 'rejected', 'suspended'],
      default: 'draft',
    },
    rejectionReason: String,
    verifiedAt: Date,
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // System Fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Create a new object to avoid modifying the original
        const transformed = { ...ret } as any;
        
        // Remove internal fields safely
        if ('__v' in transformed) {
          delete transformed.__v;
        }
        if ('_id' in transformed) {
          delete transformed._id;
        }
        
        // Helper function to safely convert ObjectId to string
        const convertObjectIdToString = (obj: any, field: string) => {
          if (obj[field] && typeof obj[field] === 'object' && '_id' in obj[field]) {
            obj[field] = obj[field]._id?.toString() || obj[field];
          }
        };
        
        // Convert ObjectId to string for nested documents
        convertObjectIdToString(transformed, 'parentCompany');
        convertObjectIdToString(transformed, 'createdBy');
        convertObjectIdToString(transformed, 'updatedBy');
        convertObjectIdToString(transformed, 'verifiedBy');
        
        return transformed;
      },
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Create a new object to avoid modifying the original
        const transformed = { ...ret } as any;
        
        // Remove internal fields safely
        if ('__v' in transformed) {
          delete transformed.__v;
        }
        if ('_id' in transformed) {
          delete transformed._id;
        }
        
        // Helper function to safely convert ObjectId to string
        const convertObjectIdToString = (obj: any, field: string) => {
          if (obj[field] && typeof obj[field] === 'object' && '_id' in obj[field]) {
            obj[field] = obj[field]._id?.toString() || obj[field];
          }
        };
        
        // Convert ObjectId to string for nested documents
        convertObjectIdToString(transformed, 'parentCompany');
        convertObjectIdToString(transformed, 'createdBy');
        convertObjectIdToString(transformed, 'updatedBy');
        convertObjectIdToString(transformed, 'verifiedBy');
        
        return transformed;
      },
    },
  }
);

// Indexes for better query performance
companySchema.index({ name: 1 });
companySchema.index({ email: 1 }, { unique: true, sparse: true });
companySchema.index({ panNumber: 1 }, { unique: true, sparse: true });
companySchema.index({ gstNumber: 1 }, { unique: true, sparse: true });
companySchema.index({ 'bankAccounts.accountNumber': 1 }, { unique: true, sparse: true });
companySchema.index({ 'bankAccounts.ifscCode': 1 });
companySchema.index({ status: 1 });
companySchema.index({ isSpv: 1 });
companySchema.index({ parentCompany: 1 });
companySchema.index({ createdBy: 1 });

// Virtuals
companySchema.virtual('parentCompanyDetails', {
  ref: 'Company',
  localField: 'parentCompany',
  foreignField: '_id',
  justOne: true,
});

companySchema.virtual('createdByDetails', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

companySchema.virtual('verifiedByDetails', {
  ref: 'User',
  localField: 'verifiedBy',
  foreignField: '_id',
  justOne: true,
});

// Pre-save hook to ensure data consistency
companySchema.pre<Document & ICompany>('save', function(next) {
  // Set updatedBy to the current user if not set
  if (!this.updatedBy && this.createdBy) {
    this.updatedBy = this.createdBy;
  }
  
  // If this is an SPV, ensure parent company is set
  if (this.isSpv && !this.parentCompany) {
    throw new Error('Parent company is required for SPV companies');
  }
  
  // If verified, set verifiedAt
  if (this.isModified('status') && this.status === 'verified' && !this.verifiedAt) {
    this.verifiedAt = new Date();
  }
  
  next();
});

export default model<ICompany>('Company', companySchema);
