import { Types } from 'mongoose';
import { IOrder, OrderStatus, OrderType } from '@/models/order.model';
import { IAsset } from '@/models/asset.model';
import Order from '@/models/order.model';
import Asset from '@/models/asset.model';
import { BaseService } from './base.service';
import { BadRequestError, NotFoundError } from '@/errors';

export class OrderService extends BaseService<IOrder> {
  constructor() {
    super(Order);
  }

  async createOrder(
    userId: string | Types.ObjectId,
    assetId: string | Types.ObjectId,
    quantity: number,
    price: number,
    type: OrderType,
    metadata: Record<string, any> = {}
  ) {
    // Convert string IDs to ObjectId if needed
    const assetObjectId = typeof assetId === 'string' ? new Types.ObjectId(assetId) : assetId;
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    // Validate asset exists and is published
    const asset = await Asset.findById(assetObjectId).exec();
    if (!asset) {
      throw new BadRequestError('Asset not found');
    }
    
    if (asset.status !== 'published') {
      throw new BadRequestError('Asset is not available for investment');
    }

    // Calculate total amount
    const totalAmount = quantity * price;

    // Create order
    const order = await this.create({
      user: userObjectId,
      asset: assetObjectId,
      quantity,
      price,
      totalAmount,
      type,
      status: OrderStatus.PENDING,
      metadata: {
        ...metadata,
        ip: metadata.ip,
        userAgent: metadata.userAgent
      }
    } as any); // Using type assertion to handle the Document type

    // In a real application, you would integrate with a payment processor here
    // and update the order status based on the payment result

    return order.populate('asset', 'name symbol');
  }

  async cancelOrder(orderId: string, userId: string | Types.ObjectId) {
    // Convert string IDs to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const orderObjectId = typeof orderId === 'string' ? new Types.ObjectId(orderId) : orderId;
    
    // Use the base class's findOne method
    const order = await this.findOne({
      _id: orderObjectId,
      user: userObjectId,
      status: OrderStatus.PENDING
    });

    if (!order) {
      throw new BadRequestError('Order not found or cannot be cancelled');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelledAt = new Date();
    
    await order.save();
    return order.populate('asset', 'name symbol');
  }

  async getUserOrders(
    userId: string | Types.ObjectId,
    options: {
      status?: OrderStatus;
      type?: OrderType;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, type, page = 1, limit = 10 } = options;
    
    // Convert string ID to ObjectId if needed
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    
    const query: any = { user: userObjectId };
    if (status) query.status = status;
    if (type) query.type = type;

    return this.paginate(query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: 'asset',
      select: '-__v'
    });
  }

  async getAllOrders(
    filters: {
      status?: OrderStatus;
      type?: OrderType;
      userId?: string | Types.ObjectId;
      assetId?: string | Types.ObjectId;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { 
      status, 
      type, 
      userId, 
      assetId, 
      page = 1, 
      limit = 20 
    } = filters;

    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;
    
    // Convert string IDs to ObjectId if needed
    if (userId) {
      query.user = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    }
    if (assetId) {
      query.asset = typeof assetId === 'string' ? new Types.ObjectId(assetId) : assetId;
    }

    // Use the base class's paginate method with proper populate format
    return this.paginate(query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'user', select: 'email firstName lastName' },
        { path: 'asset', select: 'name symbol' }
      ],
      select: '-__v'
    });
  }
}

export const orderService = new OrderService();
