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
    maxlength: [10, 'Token ticker cannot exceed 10 characters']
  },
  tokenStandard: {
    type: String,
    required: [true, 'Token standard is required'],
    enum: Object.values(TokenStandard),
  },
  smartContractAddress: { type: String }
});

const mediaSchema = new Schema<IMedia>({
  url: { type: String, required: [true, 'Media URL is required'] },
  type: {
    type: String,
    required: [true, 'Media type is required'],
    enum: ['image', 'video', 'document']
  },
  title: { type: String, required: [true, 'Media title is required'] },
  isFeatured: { type: Boolean, default: false },
  uploadedAt: { type: Date, default: Date.now }
});

const assetSchema = new Schema<IAsset>(
  {
    name: {
      type: String,
      required: [true, 'Asset name is required'],
      trim: true,
      maxlength: [200, 'Asset name cannot exceed 200 characters'],
      index: 'text' // For text search
    },
    description: {
      type: String,
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters']
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
      index: true // Index for queries
    },
    assetType: {
      type: String,
      required: [true, 'Asset type is required'],
      enum: Object.values(AssetType),
      index: true // Index for queries
    },
    ownershipType: {
      type: String,
      required: [true, 'Ownership type is required'],
      enum: Object.values(OwnershipType)
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: Object.values(AssetStatus),
      default: AssetStatus.DRAFT,
      index: true // Index for queries
    },
    
    // Location Information
    address: {
      type: addressSchema,
      required: [true, 'Address is required']
    },
    
    // Financial Information
    valuation: {
      type: valuationSchema,
      required: [true, 'Valuation is required']
    },
    
    // Physical Characteristics
    size: {
      type: sizeSchema,
      required: [true, 'Size is required']
    },
    
    // Investment Details
    investment: {
      type: investmentSchema,
      required: [true, 'Investment details are required']
    },
    
    // Token Information
    token: {
      type: tokenSchema,
      required: [true, 'Token information is required']
    },
    
    // Media and Documents
    media: [mediaSchema],
    
    // Additional Metadata
    features: [{ type: String }],
    amenities: [{ type: String }],
    tags: [{ type: String, index: true }], // Index for tag-based queries
    
    // System Fields
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    rejectionReason: {
      type: String
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        if ('_id' in ret) {
          delete (ret as any)._id;
        }
        if ('__v' in ret) {
          delete (ret as any).__v;
        }
      }
    }
  }
);

// Indexes for better query performance (removed duplicate indexes)
assetSchema.index({ company: 1, status: 1 });
assetSchema.index({ assetType: 1, status: 1 });
assetSchema.index({ 'investment.expectedROI': -1 });
assetSchema.index({ 'valuation.currentValue': -1 });
assetSchema.index({ createdAt: -1 });
assetSchema.index({ 'address.coordinates': '2dsphere' });

// Text index for search
assetSchema.index({ name: 'text', description: 'text' });

const Asset = model<IAsset>('Asset', assetSchema);

export default Asset;