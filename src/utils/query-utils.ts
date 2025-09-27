import { FilterQuery, QueryOptions, UpdateQuery } from 'mongoose';
import { IAsset, AssetStatus, AssetType } from '@/models/asset.model';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
}

export interface FilterOptions {
  search?: string;
  status?: AssetStatus;
  assetType?: AssetType;
  minValue?: number;
  maxValue?: number;
  minROI?: number;
  maxROI?: number;
  companyId?: string;
  createdBy?: string;
}

export interface SortOptions {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const buildAssetQuery = (filters: FilterOptions = {}): FilterQuery<IAsset> => {
  const query: FilterQuery<IAsset> = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.assetType) {
    query.assetType = filters.assetType;
  }

  if (filters.companyId) {
    query.company = filters.companyId;
  }

  if (filters.createdBy) {
    query.createdBy = filters.createdBy;
  }

  // Value range filter
  if (filters.minValue !== undefined || filters.maxValue !== undefined) {
    query['valuation.currentValue'] = {};
    if (filters.minValue !== undefined) {
      query['valuation.currentValue'].$gte = filters.minValue;
    }
    if (filters.maxValue !== undefined) {
      query['valuation.currentValue'].$lte = filters.maxValue;
    }
  }

  // ROI range filter
  if (filters.minROI !== undefined || filters.maxROI !== undefined) {
    query['investment.expectedROI'] = {};
    if (filters.minROI !== undefined) {
      query['investment.expectedROI'].$gte = filters.minROI;
    }
    if (filters.maxROI !== undefined) {
      query['investment.expectedROI'].$lte = filters.maxROI;
    }
  }

  // Text search
  if (filters.search) {
    query.$text = { $search: filters.search };
  }

  return query;
};

export const buildSortOptions = (sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc') => {
  const sortOptions: Record<string, 1 | -1> = {};
  
  // Map frontend sort fields to database fields
  const sortFieldMap: Record<string, string> = {
    name: 'name',
    createdAt: 'createdAt',
    currentValue: 'valuation.currentValue',
    expectedROI: 'investment.expectedROI',
    targetAmount: 'investment.targetAmount',
    tokenPrice: 'token.tokenPrice',
  };

  const dbField = sortFieldMap[sortBy] || 'createdAt';
  sortOptions[dbField] = sortOrder === 'asc' ? 1 : -1;
  
  // Add a secondary sort to ensure consistent ordering
  if (dbField !== 'createdAt') {
    sortOptions.createdAt = -1;
  }

  return sortOptions;
};

export const getPaginationOptions = (page: number = 1, limit: number = 10): PaginationOptions => {
  const pageNumber = Math.max(1, page);
  const pageSize = Math.min(100, Math.max(1, limit));
  
  return {
    page: pageNumber,
    limit: pageSize,
    skip: (pageNumber - 1) * pageSize,
  };
};

export const buildUpdateFields = (updateData: Partial<IAsset>) => {
  const updateFields: UpdateQuery<IAsset> = { $set: {} };
  const setFields = updateFields.$set as any;

  // Basic fields
  if (updateData.name !== undefined) setFields.name = updateData.name;
  if (updateData.description !== undefined) setFields.description = updateData.description;
  if (updateData.assetType) setFields.assetType = updateData.assetType;
  if (updateData.ownershipType) setFields.ownershipType = updateData.ownershipType;
  if (updateData.status) setFields.status = updateData.status;

  // Address
  if (updateData.address) {
    Object.entries(updateData.address).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields[`address.${key}`] = value;
      }
    });
  }

  // Valuation
  if (updateData.valuation) {
    Object.entries(updateData.valuation).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields[`valuation.${key}`] = value;
      }
    });
  }

  // Size
  if (updateData.size) {
    Object.entries(updateData.size).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields[`size.${key}`] = value;
      }
    });
  }

  // Investment
  if (updateData.investment) {
    Object.entries(updateData.investment).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields[`investment.${key}`] = value;
      }
    });
  }

  // Token
  if (updateData.token) {
    Object.entries(updateData.token).forEach(([key, value]) => {
      if (value !== undefined) {
        setFields[`token.${key}`] = value;
      }
    });
  }

  // Arrays (features, amenities, tags)
  if (updateData.features) setFields.features = updateData.features;
  if (updateData.amenities) setFields.amenities = updateData.amenities;
  if (updateData.tags) setFields.tags = updateData.tags;

  // Media (handle separately as it's an array of objects)
  if (updateData.media) {
    setFields.media = updateData.media;
  }

  // Clean up empty $set
  if (Object.keys(updateFields.$set as object).length === 0) {
    delete updateFields.$set;
  }

  return updateFields;
};
