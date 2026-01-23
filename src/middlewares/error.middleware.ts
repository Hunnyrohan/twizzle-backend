import { Request, Response, NextFunction } from 'express';

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  errors?: Record<string, { message: string }>;
}

const errorHandler = (
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongo duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered',
    });
  }

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
};

export default errorHandler;
