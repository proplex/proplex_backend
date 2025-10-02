import { Schema, model, Document, Types, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export enum UserRole {
  USER = 'user',
  COMPANY_ADMIN = 'company_admin',
  ADMIN = 'admin',
  VERIFIER = 'verifier',
  AUDITOR = 'auditor'
}

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  company?: Types.ObjectId;
  isEmailVerified: boolean;
  isActive: boolean;
  lastLogin?: Date;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  changedPasswordAfter(JWTTimestamp: number): boolean;
  createPasswordResetToken(): string;
  isAdmin(): boolean;
  isCompanyAdmin(): boolean;
}

interface IUserModel extends Model<IUser> {
  isAdminUser(userId: Types.ObjectId | string): Promise<boolean>;
}

const userSchema = new Schema<IUser, IUserModel>(
  {
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false,
    },
    firstName: {
      type: String,
      required: [true, 'Please provide your first name'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Please provide your last name'],
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER
      // Removed the complex setter function that was causing issues
    },
    company: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      index: true
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      select: false
    },
    lastLogin: {
      type: Date,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc: any, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        return ret;
      },
    },
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password, 12);
    
    if (!this.isNew) {
      this.passwordChangedAt = new Date(Date.now() - 1000);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Indexes for better query performance (removed duplicate email index)
userSchema.index({ company: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isEmailVerified: 1 });

// Method to check if user is an admin
userSchema.methods.isAdmin = function(): boolean {
  return this.role === UserRole.ADMIN;
};

// Method to check if user is a company admin
userSchema.methods.isCompanyAdmin = function(): boolean {
  return this.role === UserRole.COMPANY_ADMIN;
};

// Static method to check if a user is an admin
userSchema.statics.isAdminUser = async function(userId: Types.ObjectId | string): Promise<boolean> {
  // Find the user by ID and select only the role field
  const user = await this.findById(userId).select('role').lean();
  return user?.role === UserRole.ADMIN;
};

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token was issued
userSchema.methods.changedPasswordAfter = function (JWTTimestamp: number): boolean {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to create password reset token
userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  
  return resetToken;
};

// Create and export the model
export default model<IUser, IUserModel>('User', userSchema);