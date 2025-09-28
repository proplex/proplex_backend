import { Request, Response } from 'express';
import { 
  NotFoundError, 
  BadRequestError, 
  NotAuthorizedError 
} from '@/errors';
import Wallet, { 
  TransactionType, 
  TransactionStatus,
  IWallet,
  ITransaction
} from '@/models/wallet.model';
import { User } from '@/models/user.model';
import { logger } from '@/utils/logger';

export const getWallet = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  
  const wallet = await Wallet.findOne({ 
    user: userId,
    isActive: true 
  }).select('-transactions -__v');

  if (!wallet) {
    // Create wallet if it doesn't exist
    const newWallet = await Wallet.create({
      user: userId,
      balance: 0,
      currency: 'USD'
    });
    
    return res.json({
      status: 'success',
      data: {
        wallet: newWallet
      }
    });
  }

  res.json({
    status: 'success',
    data: {
      wallet
    }
  });
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

  const query: any = { 
    user: userId,
    'transactions.0': { $exists: true } // Only wallets with transactions
  };

  // Build match query for transactions
  const transactionsMatch: any = {};
  
  if (type) {
    transactionsMatch['transactions.type'] = type;
  }
  
  if (status) {
    transactionsMatch['transactions.status'] = status;
  }
  
  if (startDate || endDate) {
    transactionsMatch['transactions.createdAt'] = {};
    if (startDate) {
      transactionsMatch['transactions.createdAt'].$gte = new Date(startDate as string);
    }
    if (endDate) {
      transactionsMatch['transactions.createdAt'].$lte = new Date(endDate as string);
    }
  }

  const wallet = await Wallet.findOne(query)
    .select('transactions')
    .sort({ 'transactions.createdAt': -1 })
    .lean();

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
  let transactions = wallet.transactions;
  
  if (type) {
    transactions = transactions.filter(tx => tx.type === type);
  }
  
  if (status) {
    transactions = transactions.filter(tx => tx.status === status);
  }
  
  if (startDate || endDate) {
    const start = startDate ? new Date(startDate as string) : new Date(0);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    transactions = transactions.filter(tx => {
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
};

export const depositFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  const transaction = await Wallet.processTransaction(
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
};

export const withdrawFunds = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { amount, description } = req.body;

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid amount');
  }

  const transaction = await Wallet.processTransaction(
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

  const session = await Wallet.startSession();
  session.startTransaction();

  try {
    // Process withdrawal from sender
    const withdrawalTx = await Wallet.processTransaction(
      senderId,
      amount,
      TransactionType.TRANSFER,
      `Transfer to ${recipient.email || recipient.id}`,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        recipient: recipient.id,
        ...req.body.metadata
      }
    );

    // Process deposit to recipient
    const depositTx = await Wallet.processTransaction(
      recipientId,
      amount,
      TransactionType.TRANSFER,
      `Transfer from ${req.user!.email || req.user!.id}`,
      {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sender: senderId,
        ...req.body.metadata
      }
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      status: 'success',
      data: {
        withdrawal: withdrawalTx,
        deposit: depositTx
      }
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// Admin endpoints
export const adminGetUserWallet = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const wallet = await Wallet.findOne({ user: userId });
  
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

  const transactionType = type === 'add' 
    ? TransactionType.BONUS 
    : TransactionType.COMMISSION;

  const transaction = await Wallet.processTransaction(
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
