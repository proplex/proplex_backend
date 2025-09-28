import { Types, ClientSession, startSession } from 'mongoose';
import { 
  IWallet, 
  Wallet, 
  ITransaction, 
  TransactionType, 
  TransactionStatus, 
  WalletType, 
  WalletOwnerType, 
  IWalletAddress, 
  BlockchainNetwork,
  IAsset,
  AssetType
} from '../models/wallet.model';
import { BaseService } from './base.service';
import { BadRequestError, NotFoundError } from '../errors';
import { IUser } from '../models/user.model';

export interface WalletTransactionOptions {
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface WalletWithTransactions {
  transactions: ITransaction[];
  total: number;
  page: number;
  totalPages: number;
  wallet: IWallet;
}

export class WalletService extends BaseService<IWallet> {
  constructor() {
    super(Wallet);
  }

  /**
   * Get or create a wallet for a user, investor, company, or asset
   */
  async getOrCreateWallet(
    ownerType: WalletOwnerType,
    ownerId: string | Types.ObjectId,
    asset: IAsset,
    type: WalletType = WalletType.CRYPTO
  ): Promise<IWallet> {
    const ownerIdObj = typeof ownerId === 'string' ? new Types.ObjectId(ownerId) : ownerId;
    if (!Object.values(WalletOwnerType).includes(ownerType)) {
      throw new BadRequestError('Invalid owner type');
    }

    if (!asset?.code || !asset?.type) {
      throw new BadRequestError('Invalid asset information');
    }

    const session = await startSession();
    session.startTransaction();
    
    try {
      const query = {
        ownerType,
        'ownerId': ownerIdObj,
        'asset.code': asset.code,
        'asset.type': asset.type
      };
      
      const update = {
        $setOnInsert: {
          ownerType,
          ownerId: ownerIdObj,
          type,
          asset,
          balance: 0,
          availableBalance: 0,
          lockedBalance: 0,
          isActive: true,
          addresses: [],
          transactions: []
        }
      };
      
      // First try to find an existing wallet
      let wallet = await this.findOne(query);
      
      if (!wallet) {
        // Create a new wallet if not found
        // Cast to any to bypass TypeScript type checking for Mongoose document
        const newWallet = { ...update.$setOnInsert } as any;
        wallet = await this.create(newWallet);
      }
      await session.commitTransaction();
      return wallet;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Create a new wallet with the specified parameters
   */
  async createWallet(
    ownerType: WalletOwnerType,
    ownerId: string | Types.ObjectId,
    asset: IAsset,
    type: WalletType = WalletType.CRYPTO
  ): Promise<IWallet> {
    const ownerIdObj = typeof ownerId === 'string' ? new Types.ObjectId(ownerId) : ownerId;
    return this.create({
      ownerType,
      ownerId: ownerIdObj,
      type,
      asset,
      balance: 0,
      availableBalance: 0,
      lockedBalance: 0,
      isActive: true,
      addresses: [],
      label: `${asset.code} ${type} Wallet`,
      metadata: {}
    });
  }

  /**
   * Add a new address to a wallet
   */
  async addAddress(
    walletId: string | Types.ObjectId,
    address: string,
    network: BlockchainNetwork,
    label?: string
  ): Promise<IWallet> {
    const wallet = await this.findById(walletId.toString());
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    // Check if address already exists
    const addressExists = wallet.addresses.some(addr => addr.address === address);
    if (addressExists) {
      throw new BadRequestError('Address already exists in this wallet');
    }

    const newAddress: IWalletAddress = {
      address,
      network,
      isDefault: wallet.addresses.length === 0, // First address is default
      label,
      verifiedAt: new Date()
    };

    wallet.addresses.push(newAddress);
    
    if (newAddress.isDefault) {
      wallet.defaultAddress = address;
    }

    return wallet.save();
  }

  /**
   * Set default address for a wallet
   */
  async setDefaultAddress(
    walletId: string | Types.ObjectId,
    address: string
  ): Promise<IWallet> {
    const wallet = await this.findById(walletId.toString());
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }

    const addressToSet = wallet.addresses.find(addr => addr.address === address);
    if (!addressToSet) {
      throw new NotFoundError('Address not found in this wallet');
    }

    // Update all addresses to set isDefault to false
    wallet.addresses.forEach(addr => {
      addr.isDefault = false;
    });

    // Set the specified address as default
    addressToSet.isDefault = true;
    wallet.defaultAddress = address;
    wallet.markModified('addresses');

    return wallet.save();
  }

  /**
   * Get wallet with paginated transactions
   */
  async getWalletWithTransactions(
    walletId: string | Types.ObjectId,
    options: WalletTransactionOptions = {}
  ): Promise<WalletWithTransactions> {
    const walletIdObj = typeof walletId === 'string' ? new Types.ObjectId(walletId) : walletId;
    const { 
      type, 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10 
    } = options;

    // Input validation
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(Math.max(1, limit), 100); // Cap at 100 items per page

    // Get wallet first to verify it exists
    const walletIdStr = typeof walletId === 'string' ? walletId : walletId.toString();
    const wallet = await this.findById(walletIdStr);
    if (!wallet) {
      throw new NotFoundError(`Wallet with ID ${walletId} not found`);
    }
    
    // Build the match query for transactions
    const match: any = { 'transactions._id': { $exists: true } };
    
    // Add optional filters
    if (type) match['transactions.type'] = type;
    if (status) match['transactions.status'] = status;
    
    // Date range filtering
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);
    if (Object.keys(dateFilter).length > 0) {
      match['transactions.createdAt'] = dateFilter;
    }

    // Use a single aggregation pipeline for better performance
    const aggregationPipeline: any[] = [
      { $match: { _id: new Types.ObjectId(walletId.toString()) } },
      { $project: { transactions: 1 } },
      { $unwind: '$transactions' },
      { $match: match },
      { $sort: { 'transactions.createdAt': -1 } },
      {
        $facet: {
          metadata: [
            { $count: 'total' },
            {
              $addFields: {
                page: pageNum,
                limit: limitNum,
                totalPages: {
                  $ceil: { $divide: [{ $ifNull: ['$total', 0] }, limitNum] }
                }
              }
            }
          ],
          transactions: [
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum },
            {
              $replaceRoot: { newRoot: '$transactions' }
            }
          ]
        }
      },
      {
        $project: {
          transactions: 1,
          metadata: { $arrayElemAt: ['$metadata', 0] }
        }
      },
      {
        $addFields: {
          total: { $ifNull: ['$metadata.total', 0] },
          page: { $ifNull: ['$metadata.page', 1] },
          totalPages: { $ifNull: ['$metadata.totalPages', 0] },
          wallet: { $literal: wallet._id }
        }
      },
      { $project: { metadata: 0 } }
    ];

    // Use the base class method for aggregation
    const result = await (this.constructor as any).aggregate(aggregationPipeline);
    
    // Return default result if no data found
    if (!result || result.length === 0) {
      const walletDoc = await this.findById(walletId.toString());
      if (!walletDoc) {
        throw new NotFoundError(`Wallet with ID ${walletId} not found`);
      }
      return { 
        transactions: [], 
        total: 0, 
        page: pageNum, 
        totalPages: 0,
        wallet: walletDoc
      } as WalletWithTransactions;
    }
    
    // Ensure we have a proper WalletWithTransactions object
    if (result && result[0]) {
      const data = result[0];
      return {
        transactions: data.transactions || [],
        total: data.total || 0,
        page: data.page || pageNum,
        totalPages: data.totalPages || 0,
        wallet: wallet
      } as WalletWithTransactions;
    }
    
    // Fallback if no result
    return {
      transactions: [],
      total: 0,
      page: pageNum,
      totalPages: 0,
      wallet: wallet
    } as WalletWithTransactions;
  }

  /**
   * Process a wallet transaction (deposit/withdraw)
   */
  async processTransaction(
    walletId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    amount: number,
    type: TransactionType,
    description?: string,
    metadata: Record<string, any> = {},
    session?: ClientSession
  ): Promise<ITransaction> {
    if (!Types.ObjectId.isValid(walletId.toString())) {
      throw new BadRequestError('Invalid wallet ID format');
    }

    if (!Types.ObjectId.isValid(userId.toString())) {
      throw new BadRequestError('Invalid user ID format');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new BadRequestError('Transaction amount must be a positive number');
    }

    // Start a new session if one wasn't provided
    const shouldEndSession = !session;
    // Start a new session if one wasn't provided
    const currentSession = session || await startSession();
    
    if (!session) {
      currentSession.startTransaction();
    }

    try {
      // Use update with atomic operations to prevent race conditions
      const walletIdStr = typeof walletId === 'string' ? walletId : walletId.toString();
      const wallet = await this.update(
        walletIdStr,
        { $inc: { balance: type === TransactionType.DEPOSIT ? amount : -amount } },
        { new: true, session: currentSession }
      );

      if (!wallet) {
        throw new NotFoundError(`Wallet with ID ${walletId} not found`);
      }

      // Validate sufficient balance for withdrawals/transfers
      if (type !== TransactionType.DEPOSIT && wallet.balance < amount) {
        throw new BadRequestError('Insufficient funds for this transaction');
      }

      // Create a transaction object that matches the ITransaction interface
      const transactionData: Partial<ITransaction> = {
        wallet: wallet._id as Types.ObjectId,
        user: typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
        type,
        status: TransactionStatus.COMPLETED,
        amount,
        asset: wallet.asset,
        fee: { amount: 0, asset: wallet.asset },
        balanceBefore: wallet.balance - (type === TransactionType.DEPOSIT ? amount : -amount),
        balanceAfter: wallet.balance,
        reference: `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        description,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add transaction to wallet and save
      wallet.transactions.push(transactionData as ITransaction);
      await wallet.save({ session: currentSession });

      if (shouldEndSession) {
        await currentSession.commitTransaction();
        currentSession.endSession();
      }

      // Return the created transaction
      return wallet.transactions[wallet.transactions.length - 1];
    } catch (error) {
      if (shouldEndSession) {
        await currentSession.abortTransaction();
        currentSession.endSession();
      }
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string | Types.ObjectId): Promise<number> {
    const wallet = await this.findById(walletId.toString());
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }
    return wallet.balance;
  }

  /**
   * Check if wallet has sufficient balance for a transaction
   */
  async hasSufficientBalance(
    walletId: string | Types.ObjectId,
    amount: number
  ): Promise<boolean> {
    const wallet = await this.findById(walletId.toString());
    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }
    return wallet.balance >= amount;
  }

  /**
   * Transfer funds between wallets
   */
  async transferFunds(
    senderWalletId: string | Types.ObjectId,
    recipientWalletId: string | Types.ObjectId,
    amount: number,
    userId: string | Types.ObjectId, // The user initiating the transfer
    description?: string,
    metadata: Record<string, any> = {}
  ): Promise<{ senderTx: ITransaction; recipientTx: ITransaction }> {
    const senderId = senderWalletId.toString();
    const recipientId = recipientWalletId.toString();
    
    if (senderId === recipientId) {
      throw new BadRequestError('Cannot transfer to the same wallet');
    }

    if (amount <= 0) {
      throw new BadRequestError('Transfer amount must be greater than zero');
    }

    const session = await (this as any).model.startSession();
    session.startTransaction();

    try {
      // Get both wallets in the same transaction
      const [senderWallet, recipientWallet] = await Promise.all([
        this.findById(senderId),
        this.findById(recipientId)
      ]);

      if (!senderWallet) {
        throw new NotFoundError(`Sender wallet ${senderWalletId} not found`);
      }
      if (!recipientWallet) {
        throw new NotFoundError(`Recipient wallet ${recipientWalletId} not found`);
      }

      // Verify asset compatibility
      if (senderWallet.asset.code !== recipientWallet.asset.code || 
          senderWallet.asset.type !== recipientWallet.asset.type) {
        throw new BadRequestError('Cannot transfer between different asset types');
      }

      // Type assertions for TypeScript
      const typedSenderWallet = senderWallet as IWallet & { _id: Types.ObjectId };
      const typedRecipientWallet = recipientWallet as IWallet & { _id: Types.ObjectId };

      // Process withdrawal from sender
      const senderTx = await this.processTransaction(
        typedSenderWallet._id.toString(),
        userId.toString(),
        amount,
        TransactionType.TRANSFER,
        description || `Transfer to wallet ${recipientId}`,
        { 
          ...metadata, 
          recipientWalletId: typedRecipientWallet._id.toString(),
          recipientOwnerType: typedRecipientWallet.ownerType,
          recipientOwnerId: typedRecipientWallet.ownerId.toString()
        },
        session
      );

      // Process deposit to recipient
      const recipientTx = await this.processTransaction(
        typedRecipientWallet._id.toString(),
        userId.toString(),
        amount,
        TransactionType.TRANSFER,
        description || `Transfer from wallet ${senderId}`,
        { 
          ...metadata, 
          senderWalletId: typedSenderWallet._id.toString(),
          senderOwnerType: typedSenderWallet.ownerType,
          senderOwnerId: typedSenderWallet.ownerId.toString()
        },
        session
      );

      await session.commitTransaction();
      return { senderTx, recipientTx };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

export const walletService = new WalletService();
