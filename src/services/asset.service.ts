import { Types } from 'mongoose';
import Asset, { IAsset, AssetStatus } from '@/models/asset.model';

interface AssetInput {
  name: string;
  description?: string;
  company: string;
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

export const getAssets = async (): Promise<IAsset[]> => {
  const assets = await Asset.find()
    .populate('companyDetails')
    .sort({ createdAt: -1 });
  return assets.map(asset => asset.toJSON());
};

export const getAssetById = async (id: string): Promise<IAsset | null> => {
  const asset = await Asset.findById(id).populate('companyDetails');
  return asset ? asset.toJSON() : null;
};

export const updateAsset = async (
  id: string,
  data: Partial<AssetInput>
): Promise<IAsset | null> => {
  const updateData = { ...data };
  
  if (data.company) {
    updateData.company = new Types.ObjectId(data.company) as any;
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
  const assets = await Asset.find({ company: companyId })
    .populate('companyDetails')
    .sort({ createdAt: -1 });
  return assets.map(asset => asset.toJSON());
};
