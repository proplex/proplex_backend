import { Schema, model, Document, Types } from 'mongoose';
import { IUser } from './user.model';
import { IAsset } from './asset.model';

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

export enum OrderType {
  BUY = 'buy',
  SELL = 'sell'
}

export interface IOrder extends Document {
  user: Types.ObjectId | IUser;
  asset: Types.ObjectId | IAsset;
  quantity: number;
  price: number;
  totalAmount: number;
  type: OrderType;
  status: OrderStatus;
  executedAt?: Date;
  cancelledAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    asset: {
      type: Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.00000001, // Minimum 1 satoshi equivalent
      validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid quantity'
      }
    },
    price: {
      type: Number,
      required: true,
      min: 0.00000001,
      validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid price'
      }
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0.00000001,
      validate: {
        validator: Number.isFinite,
        message: '{VALUE} is not a valid amount'
      }
    },
    type: {
      type: String,
      enum: Object.values(OrderType),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
      index: true
    },
    executedAt: {
      type: Date
    },
    cancelledAt: {
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
        delete ret._id;
        delete ret.__v;
      }
    }
  }
);

// Indexes
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ asset: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

// Pre-save hook to calculate total amount
orderSchema.pre<IOrder>('save', function(next) {
  if (this.isModified('quantity') || this.isModified('price')) {
    this.totalAmount = this.quantity * this.price;
  }
  next();
});

const Order = model<IOrder>('Order', orderSchema);

export default Order;
