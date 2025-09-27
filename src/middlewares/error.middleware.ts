import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode}: ${message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
    res.status(statusCode).json({
      success: false,
      message,
      stack: err.stack,
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message,
    });
  }
};
