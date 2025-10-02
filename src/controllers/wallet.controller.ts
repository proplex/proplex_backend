import { Request, Response } from 'express';
import { 
  NotFoundError, 
  BadRequestError, 
  UnauthorizedError 
} from '@/errors';
import { 
  TransactionType, 
  TransactionStatus,
  IWallet,
  ITransaction,
  WalletOwnerType,
  WalletType,
  AssetType
} from '@/models/wallet.model';
import { IUser } from '@/models/user.model';
import { logger } from '@/utils/logger';
import { WalletService } from '@/services/wallet.service';
import User from '@/models/user.model';
import { Types } from 'mongoose';

const walletService = new WalletService();

export const getWallet = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  try {
    // Try to find existing wallet
    let wallet = await walletService.findOne({ 
      ownerId: userId,
      isActive: true 
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await walletService.getOrCreateWallet(
        WalletOwnerType.USER,
        userId,
        {
          type: AssetType.FIAT,
          code: 'USD',
          name: 'US Dollar',
          decimals: 2,
          isActive: true
        },
        WalletType.FIAT
      );
    }
    
    // Cast wallet to IWallet to ensure proper typing
    const typedWallet = wallet as IWallet;

    res.json({
      status: 'success',
      data: {
        wallet
      }
    });
  } catch (error) {
    throw new BadRequestError('Failed to get or create wallet');
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { 
    type, 
    status, 
    startDate, 
    endDate, 
    limit = 10, 
    page = 1 
  } = req.query;

  try {
    // Find wallet for user
    const wallet = await walletService.findOne({ 
      ownerId: userId,
      isActive: true 
    });

    if (!wallet) {
      return res.json({
        status: 'success',
        data: {
          transactions: [],
          total: 0,
          pages: 0,
          page: 1
        }
      });
    }

    // Apply filters and pagination in memory (for embedded documents)
    let transactions: any[] = wallet.transactions || [];
    
    if (type) {
      transactions = transactions.filter((tx: ITransaction) => tx.type === type);
    }
    
    if (status) {
      transactions = transactions.filter((tx: ITransaction) => tx.status === status);
    }
    
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      transactions = transactions.filter((tx: ITransaction) => {
        const txDate = new Date(tx.createdAt);
        return txDate >= start && txDate <= end;
      });
    }

    // Apply pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = pageNum * limitNum;
    
    const paginatedTransactions = transactions.slice(startIndex, endIndex);

    res.json({
      status: 'success',
      data: {
        transactions: paginatedTransactions,
        total: transactions.length,
        pages: Math.ceil(transactions.length / limitNum),
        page: pageNum
      }
    });
  } catch (error) {
    throw new BadRequestError('Failed to get transactions');
  }
};

export const depositFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  try {
    // Find wallet for user
    const wallet = await walletService.findOne({ 
      ownerId: userId,
      isActive: true 
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }
    
    // Cast wallet to IWallet to ensure proper typing
    const typedWallet = wallet as IWallet;

    const transaction = await walletService.processTransaction(
      (typedWallet._id as any).toString(),
      userId,
      amount,
      TransactionType.DEPOSIT,
      description || 'Wallet deposit',
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...req.body.metadata
      }
    );

    res.status(201).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    throw new BadRequestError('Failed to process deposit');
  }
};

export const withdrawFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  try {
    // Find wallet for user
    const wallet = await walletService.findOne({ 
      ownerId: userId,
      isActive: true 
    });

    if (!wallet) {
      throw new NotFoundError('Wallet not found');
    }
    
    // Cast wallet to IWallet to ensure proper typing
    const typedWallet = wallet as IWallet;

    const transaction = await walletService.processTransaction(
      (typedWallet._id as any).toString(),
      userId,
      amount,
      TransactionType.WITHDRAWAL,
      description || 'Withdrawal request',
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...req.body.metadata
      }
    );

    res.status(201).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error) {
    throw new BadRequestError('Failed to process withdrawal');
  }
};

export const transferFunds = async (req: Request, res: Response) => {
  const senderId = req.user!.id;
  const { recipientId, amount, description } = req.body;

  if (!recipientId) {
    throw new BadRequestError('Recipient is required');
  }

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  if (senderId === recipientId) {
    throw new BadRequestError('Cannot transfer to yourself');
  }

  // Verify recipient exists
  const recipient = await User.findById(recipientId);
  if (!recipient) {
    throw new NotFoundError('Recipient not found');
  }

  try {
    // Process transfer using wallet service
    const result = await walletService.transferFunds(
      senderId,
      recipientId,
      amount,
      senderId,
      `Transfer to ${recipient.email || recipient.id}`,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        ...req.body.metadata
      }
    );

    const { senderTx: withdrawalTx, recipientTx: depositTx } = result;

    res.status(201).json({
      status: 'success',
      data: {
        withdrawal: withdrawalTx,
        deposit: depositTx
      }
    });
  } catch (error) {
    throw error;
  }
};

// Admin endpoints
export const adminGetUserWallet = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const wallet = await walletService.findOne({ ownerId: userId });
  
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }

  res.json({
    status: 'success',
    data: {
      wallet
    }
  });
};

export const adminUpdateWalletBalance = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { amount, type, description } = req.body;

  if (!['add', 'subtract'].includes(type)) {
    throw new BadRequestError('Type must be either "add" or "subtract"');
  }

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  // Find wallet for user
  const wallet = await walletService.findOne({ ownerId: userId });
  if (!wallet) {
    throw new NotFoundError('Wallet not found');
  }
  
  // Cast wallet to IWallet to ensure proper typing
  const typedWallet = wallet as IWallet;

  const transactionType = type === 'add' 
    ? TransactionType.BONUS 
    : TransactionType.COMMISSION;

  const transaction = await walletService.processTransaction(
    (typedWallet._id as any).toString(),
    userId,
    amount,
    transactionType,
    description || `Admin ${type}ed funds`,
    {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      admin: req.user!.id,
      ...req.body.metadata
    }
  );

  res.json({
    status: 'success',
    data: {
      transaction
    }
  });
};
