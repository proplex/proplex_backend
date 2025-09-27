import { Types } from 'mongoose';
import Asset, { IAsset, AssetStatus } from '@/models/asset.model';

interface AssetInput {
  name: string;
  description?: string;
  company: string;
  updatedBy?: Types.ObjectId | string;
  updatedAt?: Date;
  value: number;
  purchaseDate: Date;
  status?: AssetStatus;
}

export const createAsset = async (data: AssetInput): Promise<IAsset> => {
  const asset = await Asset.create({
    ...data,
    company: new Types.ObjectId(data.company)
  });
  
  await asset.populate('companyDetails');
  return asset.toJSON();
};

interface GetAssetsOptions {
  query?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  skip?: number;
  populate?: string | string[];
}

export const getAssets = async (options: GetAssetsOptions = {}): Promise<IAsset[]> => {
  const { 
    query = {}, 
    sort = { createdAt: -1 }, 
    limit,
    skip,
    populate = 'companyDetails'
  } = options;
  
  let queryBuilder = Asset.find(query)
    .populate(populate)
    .sort(sort);

  if (skip) {
    queryBuilder = queryBuilder.skip(skip);
  }
  
  if (limit) {
    queryBuilder = queryBuilder.limit(limit);
  }
  
  const assets = await queryBuilder.exec();
  return assets.map(asset => asset.toJSON());
};

export const getAssetById = async (id: string): Promise<IAsset | null> => {
  const asset = await Asset.findById(id).populate('companyDetails');
  return asset ? asset.toJSON() : null;
};

export const updateAsset = async (
  id: string,
  data: Partial<AssetInput>,
  updatedBy?: Types.ObjectId | string
): Promise<IAsset | null> => {
  const updateData = { ...data };
  
  if (data.company) {
    updateData.company = new Types.ObjectId(data.company) as any;
  }
  
  // Add updatedBy if provided
  if (updatedBy) {
    updateData.updatedBy = typeof updatedBy === 'string' 
      ? new Types.ObjectId(updatedBy) 
      : updatedBy;
    updateData.updatedAt = new Date();
  }
  
  const asset = await Asset.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('companyDetails');
  
  return asset ? asset.toJSON() : null;
};

export const deleteAsset = async (id: string): Promise<boolean> => {
  const result = await Asset.deleteOne({ _id: id });
  return result.deletedCount === 1;
};

export const getAssetsByCompany = async (companyId: string): Promise<IAsset[]> => {
  const assets = await Asset.find({ company: new Types.ObjectId(companyId) })
    .populate('companyDetails');
  return assets.map(asset => asset.toJSON());
};

export const countAssets = async (query: Record<string, any> = {}): Promise<number> => {
  return Asset.countDocuments(query).exec();
};

export const changeAssetStatus = async (
  assetId: string, 
  status: AssetStatus,
  userId: Types.ObjectId | string
): Promise<IAsset | null> => {
  const asset = await Asset.findByIdAndUpdate(
    assetId,
    { 
      status,
      updatedBy: new Types.ObjectId(userId),
      updatedAt: new Date()
    },
    { new: true }
  ).populate('companyDetails');
  
  return asset ? asset.toJSON() : null;
};

export const getAssetStats = async (): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}> => {
  const [total, byStatus, byType] = await Promise.all([
    Asset.countDocuments(),
    Asset.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $project: { status: '$_id', count: 1, _id: 0 } }
    ]),
    Asset.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $project: { type: '$_id', count: 1, _id: 0 } }
    ])
  ]);

  return {
    total,
    byStatus: byStatus.reduce((acc, { status, count }) => ({
      ...acc,
      [status]: count
    }), {}),
    byType: byType.reduce((acc, { type, count }) => ({
      ...acc,
      [type]: count
    }), {})
  };
};
