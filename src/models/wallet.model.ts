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
      required: true
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    type: {
      type: String,
      enum: Object.values(TransactionType),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(TransactionStatus),
      default: TransactionStatus.PENDING
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
        required: [true, 'Asset decimals is required'],
        min: 0,
        max: 18
      },
      isActive: {
        type: Boolean,
        default: true
      },
      metadata: {
        type: Schema.Types.Mixed
      }
    },
    fee: {
      amount: {
        type: Number,
        default: 0,
        validate: {
          validator: Number.isFinite,
          message: 'Fee amount must be a valid number'
        }
      },
      asset: {
        type: {
          type: String,
          enum: Object.values(AssetType),
          required: [true, 'Fee asset type is required']
        },
        code: {
          type: String,
          required: [true, 'Fee asset code is required'],
          uppercase: true
        },
        name: {
          type: String,
          required: [true, 'Fee asset name is required']
        },
        decimals: {
          type: Number,
          required: [true, 'Fee asset decimals is required'],
          min: 0,
          max: 18
        },
        isActive: {
          type: Boolean,
          default: true
        },
        metadata: {
          type: Schema.Types.Mixed
        }
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
      required: [true, 'Reference is required'],
      index: true
    },
    externalId: {
      type: String,
      index: true
    },
    description: String,
    metadata: {
      type: Schema.Types.Mixed
    },
    confirmedAt: Date,
    processedAt: Date,
    failedAt: Date
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
      }
    }
  }
);

const walletAddressSchema = new Schema<IWalletAddress>({
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  },
  network: {
    type: String,
    enum: Object.values(BlockchainNetwork),
    required: [true, 'Network is required']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  label: String,
  verifiedAt: Date,
  metadata: {
    type: Schema.Types.Mixed
  }
});

const walletSchema = new Schema<IWallet>(
  {
    ownerType: {
      type: String,
      enum: Object.values(WalletOwnerType),
      required: [true, 'Owner type is required']
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(WalletType),
      required: [true, 'Wallet type is required']
    },
    addresses: [walletAddressSchema],
    defaultAddress: String,
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
        required: [true, 'Asset decimals is required'],
        min: 0,
        max: 18
      },
      isActive: {
        type: Boolean,
        default: true
      },
      metadata: {
        type: Schema.Types.Mixed
      }
    },
    balance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isFinite,
        message: 'Balance must be a valid number'
      }
    },
    availableBalance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isFinite,
        message: 'Available balance must be a valid number'
      }
    },
    lockedBalance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isFinite,
        message: 'Locked balance must be a valid number'
      }
    },
    label: String,
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    lastSyncedAt: Date,
    lastActivityAt: Date,
    metadata: {
      type: Schema.Types.Mixed
    },
    transactions: [transactionSchema]
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete (ret as any)._id;
        delete (ret as any).__v;
      }
    }
  }
);

// Indexes for better query performance (removed duplicate indexes)
walletSchema.index({ ownerId: 1, ownerType: 1 });
walletSchema.index({ 'asset.code': 1 });
walletSchema.index({ 'addresses.address': 1 });
walletSchema.index({ createdAt: -1 });

// Compound indexes for common queries
walletSchema.index({ ownerId: 1, ownerType: 1, 'asset.code': 1 }, { unique: true });

const Wallet = model<IWallet>('Wallet', walletSchema);

export default Wallet;