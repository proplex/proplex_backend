import { Request, Response, NextFunction } from 'express';
import * as assetService from '@/services/asset.service';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';
import { IUser } from '@/models/user.model';
import { IAsset, AssetStatus } from '@/models/asset.model';
import { NotAuthorizedError } from '../errors/not-authorized-error';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser & { _id: Types.ObjectId };
    }
  }
}

interface AuthenticatedRequest extends Request {
  user: IUser & { _id: Types.ObjectId };
}

interface AssetQueryParams {
  company?: string;
  status?: AssetStatus | AssetStatus[];
  assetType?: string | string[];
  minValue?: number;
  maxValue?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface AssetResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  errors?: any[];
}

/**
 * @route   POST /api/assets
 * @desc    Create a new asset
 * @access  Private
 */
export const createAsset = async (req: AuthenticatedRequest, res: Response<AssetResponse<IAsset>>) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const assetData = {
      ...req.body,
      createdBy: req.user._id,
      status: AssetStatus.DRAFT,
      // Set default values for required fields if not provided
      address: {
        ...req.body.address,
        coordinates: req.body.address?.coordinates || undefined
      },
      valuation: {
        ...req.body.valuation,
        currency: req.body.valuation?.currency || 'USD',
      },
      investment: {
        ...req.body.investment,
        distributionFrequency: req.body.investment?.distributionFrequency || 'quarterly',
      },
      token: {
        ...req.body.token,
        tokenStandard: req.body.token?.tokenStandard || 'ERC20',
      },
      features: req.body.features || [],
      amenities: req.body.amenities || [],
      tags: req.body.tags || [],
      media: req.body.media || []
    };

    const asset = await assetService.createAsset(assetData);
    
    res.status(201).json({ 
      success: true, 
      data: asset 
    });
  } catch (error: any) {
    console.error('Error creating asset:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

/**
 * @route   GET /api/assets
 * @desc    Get all assets with filtering, sorting and pagination
 * @access  Public
 */
export const getAssets = async (req: Request, res: Response<AssetResponse<{ assets: IAsset[]; total: number }>>) => {
  try {
    const {
      company,
      status,
      assetType,
      minValue,
      maxValue,
      search,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query as unknown as AssetQueryParams;

    // Build query
    const query: any = {};
    
    if (company) query.company = new Types.ObjectId(company as string);
    
    if (status) {
      if (Array.isArray(status)) {
        query.status = { $in: status };
      } else {
        query.status = status;
      }
    }
    
    if (assetType) {
      if (Array.isArray(assetType)) {
        query.assetType = { $in: assetType };
      } else {
        query.assetType = assetType;
      }
    }
    
    if (minValue || maxValue) {
      query['valuation.currentValue'] = {};
      if (minValue) query['valuation.currentValue'].$gte = Number(minValue);
      if (maxValue) query['valuation.currentValue'].$lte = Number(maxValue);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } },
        { 'address.country': { $regex: search, $options: 'i' } },
      ];
    }

    // If user is not admin, only show published assets or assets they created
    if (!req.user || req.user.role !== 'admin') {
      const userId = req.user?._id;
      const orConditions = [
        { status: AssetStatus.PUBLISHED },
        ...(userId ? [{ createdBy: userId }] : [])
      ];
      
      query.$or = orConditions.flat();
    }

    // Execute query with pagination
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    // Get total count first
    const total = await assetService.countAssets(query);
    
    // Then get paginated results
    const assets = await assetService.getAssets({
      query,
      sort: { [sortBy as string]: sortOrder === 'asc' ? 1 : -1 },
      limit: limitNum,
      skip
    });

    res.status(200).json({
      success: true,
      data: {
        assets,
        total,
      },
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

/**
 * @route   GET /api/assets/featured
 * @desc    Get featured assets
 * @access  Public
 */
export const getFeaturedAssets = async (req: Request, res: Response<AssetResponse<IAsset[]>>) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
    
    const assets = await assetService.getAssets({
      query: { 
        status: AssetStatus.PUBLISHED,
        'investment.expectedROI': { $exists: true },
      },
      sort: { 'investment.expectedROI': -1 },
      limit,
    });
    
    res.status(200).json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    console.error('Error fetching featured assets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   GET /api/assets/search
 * @desc    Search assets by various fields with fuzzy matching
 * @access  Public
 */
export const searchAssets = async (req: Request, res: Response<AssetResponse<IAsset[]>>) => {
  try {
    const { q, field = 'all' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    const searchQuery = q.toString().trim();
    const searchFields = Array.isArray(field) ? field : [field];
    
    // Build search conditions based on requested fields
    const searchConditions: any[] = [];
    
    if (searchFields.includes('all') || searchFields.includes('name')) {
      searchConditions.push({ name: { $regex: searchQuery, $options: 'i' } });
    }
    
    if (searchFields.includes('all') || searchFields.includes('description')) {
      searchConditions.push({ description: { $regex: searchQuery, $options: 'i' } });
    }
    
    if (searchFields.includes('all') || searchFields.includes('location')) {
      searchConditions.push(
        { 'address.street': { $regex: searchQuery, $options: 'i' } },
        { 'address.city': { $regex: searchQuery, $options: 'i' } },
        { 'address.state': { $regex: searchQuery, $options: 'i' } },
        { 'address.country': { $regex: searchQuery, $options: 'i' } },
        { 'address.postalCode': { $regex: searchQuery, $options: 'i' } }
      );
    }
    
    if (searchFields.includes('all') || searchFields.includes('features')) {
      searchConditions.push({ features: { $in: [new RegExp(searchQuery, 'i')] } });
    }
    
    // For numeric searches (like value, ROI, etc.)
    if (/^\d+$/.test(searchQuery)) {
      const numericValue = parseInt(searchQuery, 10);
      searchConditions.push(
        { 'valuation.currentValue': numericValue },
        { 'investment.targetAmount': numericValue },
        { 'investment.minimumInvestment': numericValue },
        { 'token.totalSupply': numericValue },
        { 'token.tokenPrice': numericValue }
      );
    }
    
    const query = {
      $and: [
        { $or: searchConditions },
        // Only show published assets to non-authenticated users
        ...(req.user?.role !== 'admin' ? [{ status: AssetStatus.PUBLISHED }] : [])
      ]
    };
    
    const assets = await assetService.getAssets({
      query,
      limit: 50, // Limit results for performance
    });
    
    res.status(200).json({
      success: true,
      data: assets,
    });
  } catch (error: any) {
    console.error('Error searching assets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   GET /api/assets/:id
 * @desc    Get asset by ID with detailed information
 * @access  Public (with restrictions for draft/rejected assets)
 */
export const getAssetById = async (req: Request, res: Response<AssetResponse<IAsset>>) => {
  try {
    const { id } = req.params;
    
    if (!Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset ID',
      });
    }

    const asset = await assetService.getAssetById(id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Check if user has permission to view this asset
    const isOwner = req.user && asset.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user?.role === 'admin';
    
    if (asset.status === AssetStatus.DRAFT && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This asset is not published',
      });
    }
    
    if (asset.status === AssetStatus.REJECTED && !isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'This asset has been rejected',
      });
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error: any) {
    console.error('Error fetching asset:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   PATCH /api/assets/:id
 * @desc    Update an asset
 * @access  Private
 */
export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const asset = await assetService.updateAsset(
      req.params.id,
      req.body,
      req.user._id // Use _id instead of id to match the type definition
    );

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error: any) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   PATCH /api/assets/:id/status
 * @desc    Update asset status (e.g., publish, archive, reject)
 * @access  Private (Admin/Moderator)
 */
export const updateAssetStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const asset = await assetService.changeAssetStatus(id, status, req.user._id);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error: any) {
    console.error('Error updating asset status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete an asset
 * @access  Private
 */
export const deleteAsset = async (req: Request, res: Response) => {
  try {
    // Check if user has permission to delete
    const asset = await assetService.getAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }
    
    // Only allow owner or admin to delete
    if (
      asset.createdBy.toString() !== req.user?.id && 
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this asset',
      });
    }
    
    const deleted = await assetService.deleteAsset(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Asset deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

/**
 * @route   GET /api/assets/stats
 * @desc    Get asset statistics
 * @access  Private (Admin)
 */
export const getAssetStats = async (req: Request, res: Response) => {
  try {
    const stats = await assetService.getAssetStats();
    
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error fetching asset stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};
