import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.model';

export enum WalletType {
  FIAT = 'fiat',
  CRYPTO = 'crypto'
}

export enum WalletOwnerType {
  USER = 'user',
  INVESTOR = 'investor',
  COMPANY = 'company',
  ASSET = 'asset'
}

export enum BlockchainNetwork {
  ETHEREUM = 'ethereum',
  BINANCE_SMART_CHAIN = 'binance_smart_chain',
  POLYGON = 'polygon',
  SOLANA = 'solana',
  BITCOIN = 'bitcoin',
  OTHER = 'other'
}

export interface IWalletAddress {
  address: string;
  network: BlockchainNetwork;
  isDefault: boolean;
  label?: string;
  verifiedAt?: Date;
  metadata?: Record<string, any>;
}

export enum TransactionType {
  // Common transaction types
  DEPOSIT = 'deposit',
  WITHDRAWAL = 'withdrawal',
  TRANSFER = 'transfer',
  PAYMENT = 'payment',
  REFUND = 'refund',
  COMMISSION = 'commission',
  BONUS = 'bonus',
  
  // Crypto-specific
  CRYPTO_DEPOSIT = 'crypto_deposit',
  CRYPTO_WITHDRAWAL = 'crypto_withdrawal',
  CRYPTO_SWAP = 'crypto_swap',
  
  // Fiat-specific
  FIAT_DEPOSIT = 'fiat_deposit',
  FIAT_WITHDRAWAL = 'fiat_withdrawal',
  BANK_TRANSFER = 'bank_transfer'
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  CONFIRMING = 'confirming',
  REQUIRES_ACTION = 'requires_action'
}

export enum AssetType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
  TOKEN = 'token'
}

export interface IAsset {
  type: AssetType;
  code: string;           // e.g., 'USD', 'BTC', 'ETH'
  name: string;           // e.g., 'US Dollar', 'Bitcoin', 'Ethereum'
  decimals: number;       // e.g., 2 for USD, 8 for BTC, 18 for most ERC20 tokens
  isActive: boolean;
  metadata?: Record<string, any>;
}

export interface ITransaction extends Document {
  wallet: Types.ObjectId | IWallet;
  user: Types.ObjectId | IUser;
  type: TransactionType;
  status: TransactionStatus;
  
  // Amount and currency
  amount: number;         // Positive for deposits, negative for withdrawals
  asset: IAsset;          // The asset being transacted
  fee: {
    amount: number;
    asset: IAsset;
  };
  
  // Balance tracking
  balanceBefore: number;  // Balance before this transaction
  balanceAfter: number;   // Balance after this transaction
  
  // References and metadata
  reference: string;      // Internal reference ID
  externalId?: string;    // External reference ID (e.g., blockchain tx hash)
  description?: string;
  metadata?: Record<string, any>;
  
  // Timestamps
  confirmedAt?: Date;     // When the transaction was confirmed on the blockchain
  processedAt?: Date;     // When the transaction was processed by our system
  failedAt?: Date;        // When the transaction failed (if applicable)
  
  // Standard timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface IWallet extends Document {
  // Owner information
  ownerType: WalletOwnerType;
  ownerId: Types.ObjectId;  // References User, Investor, Company, or Asset model
  
  // Wallet type and addresses
  type: WalletType;
  addresses: IWalletAddress[];
  defaultAddress?: string;  // Default wallet address
  
  // Asset information
  asset: IAsset;
  balance: number;          // Current balance in the smallest unit (e.g., satoshis, wei)
  availableBalance: number; // Balance available for withdrawal/trading
  lockedBalance: number;    // Balance locked in pending transactions
  
  // Wallet metadata
  label?: string;           // User-defined label for the wallet
  isActive: boolean;        // Whether the wallet is active
  lastSyncedAt?: Date;      // Last time the wallet was synced with the blockchain
  lastActivityAt?: Date;    // Last time the wallet was used
  
  // Metadata and relationships
  metadata?: Record<string, any>;
  transactions: Types.DocumentArray<ITransaction>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  getBalance(): Promise<number>;
  getAvailableBalance(): Promise<number>;
  getLockedBalance(): Promise<number>;
  canWithdraw(amount: number): Promise<boolean>;
  isCryptoWallet(): boolean;
  isFiatWallet(): boolean;
}

const transactionSchema = new Schema<ITransaction>(
  {
    wallet: {
      type: Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
      index: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isFinite,
        message: 'Amount must be a valid number'
      }
    },
    asset: {
      type: {
        type: String,
        enum: Object.values(AssetType),
        required: [true, 'Asset type is required']
      },
      code: {
        type: String,
        required: [true, 'Asset code is required'],
        uppercase: true
      },
      name: {
        type: String,
        required: [true, 'Asset name is required']
      },
      decimals: {
        type: Number,
        required: [true, 'Asset decimals are required'],
        min: 0,
        default: 8
      },
      isActive: {
        type: Boolean,
        default: true
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {}
      }
    },
    balanceBefore: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isFinite,
        message: 'Balance before must be a valid number'
      }
    },
    balanceAfter: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isFinite,
        message: 'Balance after must be a valid number'
      }
    },
    reference: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: function() {
        return `TX-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
    },
    description: {
      type: String
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
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

const walletAddressSchema = new Schema<IWalletAddress>({
  address: {
    type: String,
    required: [true, 'Wallet address is required'],
    trim: true,
    index: true
  },
  network: {
    type: String,
    enum: Object.values(BlockchainNetwork),
    required: [true, 'Blockchain network is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  label: {
    type: String,
    trim: true
  },
  verifiedAt: {
    type: Date
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  }
});

const walletSchema = new Schema<IWallet>(
  {
    ownerType: {
      type: String,
      enum: Object.values(WalletOwnerType),
      required: [true, 'Owner type is required'],
      index: true
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(WalletType),
      required: [true, 'Wallet type is required'],
      index: true
    },
    addresses: [walletAddressSchema],
    defaultAddress: {
      type: String,
      trim: true,
      sparse: true
    },
    asset: {
      type: {
        type: String,
        enum: Object.values(AssetType),
        required: [true, 'Asset type is required']
      },
      code: {
        type: String,
        required: [true, 'Asset code is required'],
        uppercase: true
      },
      name: {
        type: String,
        required: [true, 'Asset name is required']
      },
      decimals: {
        type: Number,
        required: [true, 'Asset decimals are required'],
        min: 0,
        default: 8
      },
      isActive: {
        type: Boolean,
        default: true
      },
      metadata: {
        type: Schema.Types.Mixed,
        default: {}
      }
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    lockedBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    label: {
      type: String,
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    },
    lastSyncedAt: {
      type: Date
    },
    lastActivityAt: {
      type: Date
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    },
    transactions: [transactionSchema]
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        if (ret.__v !== undefined) {
          delete ret.__v;
        }
      }
    }
  }
);

// Indexes
walletSchema.index({ ownerType: 1, ownerId: 1, type: 1, 'asset.code': 1 }, { unique: true });
walletSchema.index({ 'addresses.address': 1 }, { unique: true, sparse: true });
walletSchema.index({ 'asset.code': 1 });
walletSchema.index({ updatedAt: 1 });

/**
 * Get current wallet balance
 */
walletSchema.methods.getBalance = async function(): Promise<number> {
  return this.balance;
};

/**
 * Check if wallet has sufficient balance for withdrawal
 */
walletSchema.methods.canWithdraw = async function(amount: number): Promise<boolean> {
  return this.availableBalance >= amount;
};

/**
 * Generate a unique reference for transactions
 */
walletSchema.methods.generateReference = function(): string {
  return `TX-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
};

/**
 * Add a new address to the wallet
 */
walletSchema.methods.addAddress = function(addressData: Omit<IWalletAddress, 'isDefault'>): void {
  // If this is the first address, set it as default
  if (this.addresses.length === 0) {
    this.addresses.push({ ...addressData, isDefault: true });
    this.defaultAddress = addressData.address;
  } else {
    this.addresses.push({ ...addressData, isDefault: false });
  }
};

/**
 * Set default address
 */
walletSchema.methods.setDefaultAddress = function(address: string): void {
  const addressToSet = this.addresses.find((a: IWalletAddress) => a.address === address);
  if (!addressToSet) {
    throw new Error('Address not found in wallet');
  }
  
  // Reset existing default
  this.addresses.forEach((a: IWalletAddress) => {
    a.isDefault = false;
  });
  
  // Set new default
  addressToSet.isDefault = true;
  this.defaultAddress = address;
  this.markModified('addresses');
};

/**
 * Verify an address
 */
walletSchema.methods.verifyAddress = function(address: string, verifiedAt: Date = new Date()): void {
  const addressToVerify = this.addresses.find((a: IWalletAddress) => a.address === address);
  if (!addressToVerify) {
    throw new Error('Address not found in wallet');
  }
  
  addressToVerify.verifiedAt = verifiedAt;
  this.markModified('addresses');
};

/**
 * Process wallet transaction (deposit/withdraw)
 */
walletSchema.statics.processTransaction = async function(
  userId: string | Types.ObjectId,
  amount: number,
  type: TransactionType,
  description?: string,
  metadata: Record<string, any> = {}
) {
  if (amount <= 0) {
    throw new Error('Amount must be greater than 0');
  }

  const session = await this.startSession();
  session.startTransaction();

  try {
    // Find wallet and lock it for update
    const wallet = await this.findOneAndUpdate(
      { user: userId, isActive: true },
      { $setOnInsert: { balance: 0, currency: 'USD' } },
      { new: true, upsert: true, session }
    ).select('+balance');

    if (!wallet) {
      throw new Error('Wallet not found or inactive');
    }

    // Calculate new balance
    let newBalance = wallet.balance;
    if (type === TransactionType.DEPOSIT || 
        type === TransactionType.REFUND || 
        type === TransactionType.BONUS) {
      newBalance += amount;
    } else {
      if (wallet.balance < amount) {
        throw new Error('Insufficient funds');
      }
      newBalance -= amount;
    }

    // Create transaction
    const transaction = {
      wallet: wallet._id,
      user: wallet.user,
      amount,
      balance: newBalance,
      type,
      status: TransactionStatus.COMPLETED,
      description,
      metadata: {
        ...metadata,
        ip: metadata.ip,
        userAgent: metadata.userAgent
      }
    };

    // Update wallet balance and add transaction
    wallet.balance = newBalance;
    wallet.lastTransactionAt = new Date();
    wallet.transactions.push(transaction);

    await wallet.save({ session });
    await session.commitTransaction();
    session.endSession();

    // Return the created transaction
    const createdTransaction = wallet.transactions[wallet.transactions.length - 1];
    return {
      ...createdTransaction.toObject(),
      wallet: wallet._id,
      user: wallet.user
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const Wallet = model<IWallet>('Wallet', walletSchema);

export { Wallet, walletSchema };
