import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.model';
import { ICompany } from './company.model';

export interface Investor extends Document {
  user: Types.ObjectId | IUser;
  company: Types.ObjectId | ICompany;
  investmentAmount: number;
  ownershipPercentage: number;
  isActive: boolean;
  investedAt: Date;
  exitedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const investorSchema = new Schema<Investor>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: true
    },
    investmentAmount: {
      type: Number,
      required: true,
      min: 0.01,
      validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid investment amount'
      }
    },
    ownershipPercentage: {
      type: Number,
      required: true,
      min: 0.01,
      max: 100,
      validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid percentage'
      }
    },
    isActive: {
      type: Boolean,
      default: true
    },
    investedAt: {
      type: Date,
      default: Date.now
    },
    exitedAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
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

// Compound index to ensure one active investment per user per company
investorSchema.index(
  { user: 1, company: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } }
);

// Indexes for common queries (removed duplicate indexes)
investorSchema.index({ user: 1, isActive: 1 });
investorSchema.index({ company: 1, isActive: 1 });
investorSchema.index({ investedAt: -1 });

const Investor = model<Investor>('Investor', investorSchema);

export default Investor;