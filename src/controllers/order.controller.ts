import { Request, Response } from 'express';
import { NotFoundError, BadRequestError, UnauthorizedError } from '@/errors';
import Order from '@/models/order.model';
import Asset from '@/models/asset.model';
import User from '@/models/user.model';
import { logger } from '@/utils/logger';
import { OrderStatus, OrderType } from '@/models/order.model';

export const createOrder = async (req: Request, res: Response) => {
  const { assetId, quantity, price, type } = req.body;
  const userId = req.user!.id;

  // Validate asset exists
  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw new BadRequestError('Invalid asset');
  }

  // Calculate total amount
  const totalAmount = quantity * price;

  // Create order
  const order = new Order({
    user: userId,
    asset: assetId,
    quantity,
    price,
    totalAmount,
    type,
    status: OrderStatus.PENDING,
    metadata: {
      ip: req.ip,
      userAgent: req.get('user-agent')
    }
  });

  await order.save();

  // In a real application, you would integrate with a payment processor here
  // and update the order status based on the payment result

  res.status(201).json({
    status: 'success',
    data: {
      order
    }
  });
};

export const getOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const order = await Order.findOne({
    _id: id,
    user: userId
  }).populate('asset', 'name symbol');

  if (!order) {
    throw new NotFoundError('Order not found');
  }

  res.json({
    status: 'success',
    data: {
      order
    }
  });
};

export const getOrders = async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { status, type, limit = 10, page = 1 } = req.query;

  const query: any = { user: userId };
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }

  const options = {
    limit: parseInt(limit as string, 10),
    page: parseInt(page as string, 10),
    sort: { createdAt: -1 },
    populate: 'asset',
    select: '-__v'
  };

  // @ts-ignore - Missing type definitions for mongoose-paginate-v2
  const orders = await Order.paginate(query, options);

  res.json({
    status: 'success',
    data: orders
  });
};

export const cancelOrder = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  const order = await Order.findOne({
    _id: id,
    user: userId,
    status: OrderStatus.PENDING
  });

  if (!order) {
    throw new BadRequestError('Order not found or cannot be cancelled');
  }

  order.status = OrderStatus.CANCELLED;
  order.cancelledAt = new Date();
  await order.save();

  res.json({
    status: 'success',
    data: {
      order
    }
  });
};

// Admin only endpoints
export const getAllOrders = async (req: Request, res: Response) => {
  const { status, type, userId, assetId, limit = 20, page = 1 } = req.query;

  const query: any = {};
  
  if (status) {
    query.status = status;
  }
  
  if (type) {
    query.type = type;
  }

  if (userId) {
    query.user = userId;
  }

  if (assetId) {
    query.asset = assetId;
  }

  const options = {
    limit: parseInt(limit as string, 10),
    page: parseInt(page as string, 10),
    sort: { createdAt: -1 },
    populate: [
      { path: 'user', select: 'email firstName lastName' },
      { path: 'asset', select: 'name symbol' }
    ],
    select: '-__v'
  };

  // @ts-ignore - Missing type definitions for mongoose-paginate-v2
  const orders = await Order.paginate(query, options);

  res.json({
    status: 'success',
    data: orders
  });
};
