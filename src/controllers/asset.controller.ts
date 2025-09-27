import { Request, Response } from 'express';
import * as assetService from '@/services/asset.service';
import { validationResult } from 'express-validator';
import { Types } from 'mongoose';

/**
 * @route   POST /api/assets
 * @desc    Create a new asset
 * @access  Private
 */
export const createAsset = async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    // Add createdBy from authenticated user
    const assetData = {
      ...req.body,
      createdBy: req.user.id, // Assuming user is attached to request by auth middleware
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
 * @desc    Get all assets with filtering and pagination
 * @access  Public
 */
export const getAssets = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      status,
      assetType,
      minValue,
      maxValue,
      minROI,
      maxROI,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      companyId,
    } = req.query;

    const result = await assetService.getAssets({
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      status: status as string | string[],
      assetType: assetType as string | string[],
      minValue: minValue ? parseFloat(minValue as string) : undefined,
      maxValue: maxValue ? parseFloat(maxValue as string) : undefined,
      minROI: minROI ? parseFloat(minROI as string) : undefined,
      maxROI: maxROI ? parseFloat(maxROI as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      companyId: companyId as string,
      // Only include createdBy filter for admin users
      ...(req.user?.role === 'admin' ? {} : { createdBy: req.user?.id }),
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
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
export const getFeaturedAssets = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 6;
    const assets = await assetService.getFeaturedAssets(limit);
    
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
 * @desc    Search assets by text
 * @access  Public
 */
export const searchAssets = async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    
    if (!q) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }
    
    const assets = await assetService.searchAssets(
      q as string,
      parseInt(limit as string, 10)
    );
    
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
 * @desc    Get asset by ID
 * @access  Public
 */
export const getAssetById = async (req: Request, res: Response) => {
  try {
    if (!Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid asset ID',
      });
    }

    const asset = await assetService.getAssetById(req.params.id);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found',
      });
    }

    // Check if user has permission to view this asset
    if (
      asset.status !== 'published' && 
      req.user?.id !== asset.createdBy.toString() &&
      req.user?.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this asset',
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
export const updateAsset = async (req: Request, res: Response) => {
  try {
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
      req.user.id // Pass the user ID for updatedBy
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
    const { status, rejectionReason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }
    
    // Only allow admins/moderators to change status
    if (req.user?.role !== 'admin' && req.user?.role !== 'moderator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update asset status',
      });
    }
    
    const asset = await assetService.changeAssetStatus(
      req.params.id,
      status,
      req.user.id,
      rejectionReason
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
    // Only allow admins to view stats
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view stats',
      });
    }
    
    const companyId = req.query.companyId as string | undefined;
    const stats = await assetService.getAssetStats(companyId);
    
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
