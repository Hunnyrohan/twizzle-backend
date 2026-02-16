import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user.model';

const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // ✅ READ TOKEN FROM COOKIE
    // ✅ READ TOKEN FROM COOKIE OR HEADER
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log(`Auth Middleware: ${req.method} ${req.path}`, { token: token ? 'Present' : 'Missing' });

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // ✅ VERIFY TOKEN
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as { id: string; tokenVersion?: number };

    console.log(`Auth Middleware: Decoded ID: ${decoded.id}`);

    // ✅ GET USER
    const user = await User.findById(decoded.id).lean<IUser>();

    if (!user) {
      console.log('Auth Middleware: User not found in DB');
      return res.status(401).json({
        success: false,
        message: 'Unauthorized - User not found',
      });
    }

    // ✅ CHECK TOKEN VERSION
    if (decoded.tokenVersion !== undefined && user.tokenVersion !== decoded.tokenVersion) {
      console.log(`Auth Middleware: Version mismatch. Token: ${decoded.tokenVersion}, DB: ${user.tokenVersion}`);
      return res.status(401).json({
        success: false,
        message: 'Session expired (Logged out from all devices)',
      });
    }

    // For older tokens without version, we might want to allow or force logout.
    // Assuming new system, let's allow if undefined for backward compat or force if strict.
    // MVP: Allow if undefined (or treat as 0).
    const currentVersion = user.tokenVersion || 0;
    const tokenVersion = decoded.tokenVersion || 0;
    if (tokenVersion !== currentVersion) {
      console.log(`Auth Middleware: Strict version mismatch. Token: ${tokenVersion}, DB: ${currentVersion}`);
      return res.status(401).json({
        success: false,
        message: 'Session expired',
      });
    }

    // ✅ ATTACH USER
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
  }
};

export default authMiddleware;
