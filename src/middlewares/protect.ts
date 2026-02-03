import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user.model';

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string };

    // 👇 THIS IS THE FIX
    const user = await User.findById(decoded.id)
      .select('-password')
      .lean<IUser>();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    req.user = user; // ✅ NO TYPE ERROR
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Not authorized',
    });
  }
};
