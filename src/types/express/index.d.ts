import { UserRole } from '@/models/user.model';

declare global {
  namespace Express {
    interface UserPayload {
      id: string;
      role: UserRole;
      company?: string;
      [key: string]: any;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
