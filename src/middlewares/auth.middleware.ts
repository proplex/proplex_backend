import { Request, Response, NextFunction } from 'express';
import { NotAuthorizedError } from '@/errors/not-authorized-error';
import { UserRole } from '@/models/user.model';
import { web3Auth } from '@/utils/jwt';

export const requireAuth = [
  // First try Web3Auth
  web3Auth,
  
  // If Web3Auth fails, try traditional session auth
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new NotAuthorizedError('Authentication required');
    }
    next();
  }
];

export const requireAdmin = [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.ADMIN) {
      throw new NotAuthorizedError('Admin access required');
    }
    next();
  }
];

export const requireCompanyAdmin = [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== UserRole.COMPANY_ADMIN) {
      throw new NotAuthorizedError('Company admin access required');
    }
    next();
  }
];

export const requireAnyAdmin = [
  requireAuth,
  (req: Request, res: Response, next: NextFunction) => {
    if (![UserRole.ADMIN, UserRole.COMPANY_ADMIN].includes(req.user?.role as UserRole)) {
      throw new NotAuthorizedError('Admin or company admin access required');
    }
    next();
  }
];

export const requireRole = (roles: UserRole[]) => {
  return [
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      if (!req.user || !roles.includes(req.user.role as UserRole)) {
        throw new NotAuthorizedError(
          `Required role(s): ${roles.join(', ')}. Current role: ${req.user?.role || 'none'}`
        );
      }
      next();
    }
  ];
};

export const requireSelfOrAdmin = (userIdParam = 'id') => {
  return [
    requireAuth,
    (req: Request, res: Response, next: NextFunction) => {
      const isSelf = req.user?.id === req.params[userIdParam];
      const isAdmin = req.user?.role === UserRole.ADMIN;
      
      if (!isSelf && !isAdmin) {
        throw new NotAuthorizedError('Not authorized to perform this action');
      }
      next();
    }
  ];
};
