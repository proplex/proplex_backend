import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import companyRoutes from '@/routes/company.routes';
import assetRoutes from '@/routes/asset.routes';
import { orderRoutes } from '@/routes/order.routes';
import { investorRoutes } from '@/routes/investor.routes';
import { walletRoutes } from '@/routes/wallet.routes';
import { errorHandler } from '@/middlewares/error.middleware';

dotenv.config();

class App {
  public app: Application;

  constructor() {
    this.app = express();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(compression());
    
    if (process.env.NODE_ENV === 'development') {
      this.app.use(morgan('dev'));
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', timestamp: new Date() });
    });

    // API routes
    this.app.use('/api/companies', companyRoutes);
    this.app.use('/api/assets', assetRoutes);
    this.app.use('/api/orders', orderRoutes);
    this.app.use('/api/investments', investorRoutes);
    this.app.use('/api/wallet', walletRoutes);

    // Handle 404
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({ message: 'Not Found' });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }
}

export default new App().app;
