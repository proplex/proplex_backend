import { Schema, model, Document, Types } from 'mongoose';

export const AssetStatus = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
} as const;

export type AssetStatus = typeof AssetStatus[keyof typeof AssetStatus];

export const AssetType = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  LAND: 'land',
  MIXED_USE: 'mixed_use',
  OTHER: 'other',
} as const;

export type AssetType = typeof AssetType[keyof typeof AssetType];

export const OwnershipType = {
  FREEHOLD: 'freehold',
  LEASEHOLD: 'leasehold',
  COOPERATIVE: 'cooperative',
  CONDOMINIUM: 'condominium',
  OTHER: 'other',
} as const;

export type OwnershipType = typeof OwnershipType[keyof typeof OwnershipType];

export const DistributionFrequency = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUALLY: 'annually',
} as const;

export type DistributionFrequency = typeof DistributionFrequency[keyof typeof DistributionFrequency];

export const TokenStandard = {
  ERC20: 'ERC20',
  BEP20: 'BEP20',
  OTHER: 'other',
} as const;

export type TokenStandard = typeof TokenStandard[keyof typeof TokenStandard];

export interface IAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: [number, number]; // [longitude, latitude]
}

export interface IValuation {
  currentValue: number;
  purchasePrice: number;
  purchaseDate: Date;
  annualAppreciationRate?: number;
  currency: string;
}

export interface ISize {
  totalArea: number; // in square feet
  builtUpArea?: number;
  plotArea?: number;
  floors?: number;
  units?: number;
  yearBuilt?: number;
}

export interface IInvestment {
  targetAmount: number;
  minimumInvestment: number;
  expectedROI?: number;
  holdingPeriod?: number; // in months
  distributionFrequency: DistributionFrequency;
}

export interface IToken {
  totalSupply: number;
  tokenPrice: number;
  tokenTicker: string;
  tokenStandard: TokenStandard;
  smartContractAddress?: string;
}

export interface IMedia {
  url: string;
  type: 'image' | 'video' | 'document';
  title: string;
  isFeatured: boolean;
  uploadedAt: Date;
}

export interface IAsset extends Document {
  // Basic Information
  name: string;
  description: {
    type: String,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  };
  company: Types.ObjectId;
  assetType: AssetType;
  ownershipType: OwnershipType;
  status: AssetStatus;
  
  // Location Information
  address: IAddress;
  
  // Financial Information
  valuation: IValuation;
  
  // Physical Characteristics
  size: ISize;
  
  // Investment Details
  investment: IInvestment;
  
  // Token Information
  token: IToken;
  
  // Media and Documents
  media: IMedia[];
  
  // Additional Metadata
  features: string[];
  amenities: string[];
  tags: string[];
  
  // System Fields
  createdBy: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  
  // Virtuals
  companyDetails?: any;
  creator?: any;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

const addressSchema = new Schema<IAddress>({
  street: { type: String, required: [true, 'Street is required'] },
  city: { type: String, required: [true, 'City is required'] },
  state: { type: String, required: [true, 'State is required'] },
  country: { type: String, required: [true, 'Country is required'] },
  postalCode: { type: String, required: [true, 'Postal code is required'] },
  coordinates: {
    type: [Number],
    index: '2dsphere',
    validate: {
      validator: function(v: number[] | undefined) {
        return !v || v.length === 0 || v.length === 2;
      },
      message: 'Coordinates must be an array of [longitude, latitude]'
    }
  },
});

const valuationSchema = new Schema<IValuation>({
  currentValue: { type: Number, required: [true, 'Current value is required'], min: 0 },
  purchasePrice: { type: Number, required: [true, 'Purchase price is required'], min: 0 },
  purchaseDate: { type: Date, required: [true, 'Purchase date is required'] },
  annualAppreciationRate: { type: Number, min: 0, max: 100 },
  currency: { type: String, default: 'USD' },
});

const sizeSchema = new Schema<ISize>({
  totalArea: { type: Number, required: [true, 'Total area is required'], min: 0 },
  builtUpArea: { type: Number, min: 0 },
  plotArea: { type: Number, min: 0 },
  floors: { type: Number, min: 1 },
  units: { type: Number, min: 1 },
  yearBuilt: { type: Number, min: 1800, max: new Date().getFullYear() },
});

const investmentSchema = new Schema<IInvestment>({
  targetAmount: { type: Number, required: [true, 'Target amount is required'], min: 0 },
  minimumInvestment: { type: Number, required: [true, 'Minimum investment is required'], min: 0 },
  expectedROI: { type: Number, min: 0, max: 1000 },
  holdingPeriod: { type: Number, min: 1 },
  distributionFrequency: {
    type: String,
    required: [true, 'Distribution frequency is required'],
    enum: Object.values(DistributionFrequency),
  },
});

const tokenSchema = new Schema<IToken>({
  totalSupply: { type: Number, required: [true, 'Total supply is required'], min: 0 },
  tokenPrice: { type: Number, required: [true, 'Token price is required'], min: 0 },
  tokenTicker: {
    type: String,
    required: [true, 'Token ticker is required'],
    uppercase: true,
    minlength: 1,
    maxlength: 10,
  },
  tokenStandard: {
    type: String,
    required: [true, 'Token standard is required'],
    enum: Object.values(TokenStandard),
  },
  smartContractAddress: { type: String, trim: true },
});

const mediaSchema = new Schema<IMedia>({
  url: { type: String, required: [true, 'Media URL is required'] },
  type: {
    type: String,
    required: [true, 'Media type is required'],
    enum: ['image', 'video', 'document'],
  },
  title: { type: String, required: [true, 'Media title is required'] },
  isFeatured: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now },
});

const textIndexFields = {
  name: 'text',
  description: 'text',
  'address.street': 'text',
  'address.city': 'text',
  'address.state': 'text',
  'address.country': 'text',
  tags: 'text',
  features: 'text',
  amenities: 'text'
};

const assetSchema = new Schema<IAsset>(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [200, 'Asset name cannot exceed 200 characters'],
      index: 'text'
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true
    },
    assetType: {
      type: String,
      enum: Object.values(AssetType),
      required: [true, 'Asset type is required'],
      index: true
    },
    ownershipType: {
      type: String,
      enum: ['freehold', 'leasehold', 'cooperative', 'condominium', 'other'],
      required: [true, 'Ownership type is required'],
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected', 'archived'],
      default: 'draft',
    },
    
    // Location Information
    address: {
      street: { type: String, required: [true, 'Street address is required'] },
      city: { type: String, required: [true, 'City is required'] },
      state: { type: String, required: [true, 'State is required'] },
      country: { type: String, required: [true, 'Country is required'] },
      postalCode: { type: String, required: [true, 'Postal code is required'] },
      coordinates: {
        type: [Number], // [longitude, latitude]
        index: '2dsphere',
      },
    },
    
    // Financial Information
    valuation: {
      currentValue: { type: Number, required: [true, 'Current value is required'], min: 0 },
      purchasePrice: { type: Number, required: [true, 'Purchase price is required'], min: 0 },
      purchaseDate: { type: Date, required: [true, 'Purchase date is required'] },
      annualAppreciationRate: { type: Number, min: 0, max: 100 },
      currency: { type: String, default: 'USD' },
    },
    
    // Physical Characteristics
    size: {
      totalArea: { type: Number, required: [true, 'Total area is required'], min: 0 },
      builtUpArea: { type: Number, min: 0 },
      plotArea: { type: Number, min: 0 },
      floors: { type: Number, min: 0 },
      units: { type: Number, min: 0 },
      yearBuilt: { type: Number, min: 1800, max: new Date().getFullYear() },
    },
    
    // Investment Details
    investment: {
      targetAmount: { type: Number, required: [true, 'Target amount is required'], min: 0 },
      minimumInvestment: { type: Number, required: [true, 'Minimum investment is required'], min: 0 },
      expectedROI: { type: Number, min: 0, max: 1000 },
      holdingPeriod: { type: Number, min: 1 }, // in months
      distributionFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'annually'],
        default: 'quarterly',
      },
    },
    
    // Token Information
    token: {
      totalSupply: { type: Number, required: [true, 'Total token supply is required'], min: 0 },
      tokenPrice: { type: Number, required: [true, 'Token price is required'], min: 0 },
      tokenTicker: { 
        type: String, 
        required: [true, 'Token ticker is required'],
        uppercase: true,
        maxlength: [10, 'Token ticker cannot exceed 10 characters'],
      },
      tokenStandard: {
        type: String,
        enum: ['ERC20', 'BEP20', 'other'],
        default: 'ERC20',
      },
      smartContractAddress: {
        type: String,
        validate: {
          validator: function(v: string) {
            // Basic Ethereum address validation
            return !v || /^0x[a-fA-F0-9]{40}$/.test(v);
          },
          message: (props: any) => `${props.value} is not a valid smart contract address`,
        },
      },
    },
    
    // Media and Documents
    media: [{
      url: { type: String, required: true },
      type: { 
        type: String, 
        enum: ['image', 'video', 'document'],
        required: true,
      },
      title: { type: String, required: [true, 'Media title is required'] },
      isFeatured: { type: Boolean, default: false },
      uploadedAt: { type: Date, default: Date.now },
    }],
    
    // Additional Metadata
    features: [{ type: String }],
    amenities: [{ type: String }],
    tags: [{ type: String }],
    
    // System Fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
      index: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: Date,
    rejectionReason: String,
  },
  {
    timestamps: true,
    toJSON: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Create a new object to avoid modifying the original
        const transformed = { ...ret };
        
        // Remove internal fields
        delete transformed.__v;
        delete transformed._id;
        
        // Convert ObjectId to string for nested documents
        if (transformed.company && typeof transformed.company === 'object') {
          transformed.company = (transformed.company as any)._id?.toString() || transformed.company;
        }
        if (transformed.createdBy && typeof transformed.createdBy === 'object') {
          transformed.createdBy = (transformed.createdBy as any)._id?.toString() || transformed.createdBy;
        }
        if (transformed.updatedBy && typeof transformed.updatedBy === 'object') {
          transformed.updatedBy = (transformed.updatedBy as any)._id?.toString() || transformed.updatedBy;
        }
        if (transformed.approvedBy && typeof transformed.approvedBy === 'object') {
          transformed.approvedBy = (transformed.approvedBy as any)._id?.toString() || transformed.approvedBy;
        }
        
        return transformed;
      },
    },
    toObject: { 
      virtuals: true,
      transform: function(doc, ret) {
        // Create a new object to avoid modifying the original
        const transformed = { ...ret };
        
        // Remove internal fields
        delete transformed.__v;
        delete transformed._id;
        
        // Convert ObjectId to string for nested documents
        if (transformed.company && typeof transformed.company === 'object') {
          transformed.company = (transformed.company as any)._id?.toString() || transformed.company;
        }
        if (transformed.createdBy && typeof transformed.createdBy === 'object') {
          transformed.createdBy = (transformed.createdBy as any)._id?.toString() || transformed.createdBy;
        }
        if (transformed.updatedBy && typeof transformed.updatedBy === 'object') {
          transformed.updatedBy = (transformed.updatedBy as any)._id?.toString() || transformed.updatedBy;
        }
        if (transformed.approvedBy && typeof transformed.approvedBy === 'object') {
          transformed.approvedBy = (transformed.approvedBy as any)._id?.toString() || transformed.approvedBy;
        }
        
        return transformed;
      },
    },
  }
);

// Indexes for better query performance
assetSchema.index({ company: 1 });
assetSchema.index({ 'address.coordinates': '2dsphere' });
assetSchema.index({ status: 1 });
assetSchema.index({ assetType: 1 });
assetSchema.index({ 'valuation.currentValue': 1 });
assetSchema.index({ 'investment.targetAmount': 1 });
assetSchema.index({ 'token.tokenTicker': 1 }, { unique: true, sparse: true });
assetSchema.index({ 'token.smartContractAddress': 1 }, { unique: true, sparse: true });

// Text index for search
assetSchema.index({
  name: 'text',
  description: 'text',
  'address.street': 'text',
  'address.city': 'text',
  'address.state': 'text',
  'address.country': 'text',
  'tags': 'text',
  'features': 'text',
  'amenities': 'text'
} as const);

// Pre-save hook to validate data
assetSchema.pre('save', function(next) {
  // Validate that purchase date is not in the future
  if (this.valuation?.purchaseDate && this.valuation.purchaseDate > new Date()) {
    throw new Error('Purchase date cannot be in the future');
  }

  // Validate that current value is not negative
  if (this.valuation?.currentValue < 0) {
    throw new Error('Current value cannot be negative');
  }

  next();
});

// Add text search method
assetSchema.statics.textSearch = async function(query: string, filters: any = {}) {
  return this.find(
    { 
      $text: { $search: query },
      ...filters
    },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

// Virtual for company details
assetSchema.virtual('companyDetails', {
  ref: 'Company',
  localField: 'company',
  foreignField: '_id',
  justOne: true,
});

// Virtual for creator details
assetSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true,
});

// Add text index for search
assetSchema.index({
  name: 'text',
  description: 'text',
  'address.street': 'text',
  'address.city': 'text',
  'address.state': 'text',
  'address.country': 'text',
  'token.tokenTicker': 'text',
  features: 'text',
  amenities: 'text',
  tags: 'text',
});

// Pre-save hook to ensure at least one media is featured
assetSchema.pre('save', function(next) {
  if (this.media && this.media.length > 0) {
    const hasFeatured = this.media.some(media => media.isFeatured);
    if (!hasFeatured) {
      this.media[0].isFeatured = true;
    }
  }
  next();
});

export default model<IAsset>('Asset', assetSchema);
