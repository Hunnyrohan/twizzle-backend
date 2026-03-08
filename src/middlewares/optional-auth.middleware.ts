import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/user.model';

/**
 * Optional Authentication Middleware
 * Attaches req.user if a valid token is present, but does NOT block if token is missing or invalid.
 */
const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        let token = req.headers.authorization?.startsWith('Bearer')
            ? req.headers.authorization.split(' ')[1]
            : req.cookies?.token;

        console.log(`[OptionalAuth] Request: ${req.method} ${req.originalUrl}, Token: ${token ? 'PRESENT' : 'MISSING'}`);

        if (!token) {
            return next();
        }

        // VERIFY TOKEN
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { id: string; tokenVersion?: number };

        console.log(`[OptionalAuth] Decoded ID: ${decoded.id}`);

        // GET USER
        const user = await User.findById(decoded.id).lean<IUser>();

        if (!user) {
            console.log(`[OptionalAuth] User not found in DB for ID: ${decoded.id}`);
            return next();
        }

        console.log(`[OptionalAuth] Found User: ${user.username} (${user._id})`);

        // CHECK TOKEN VERSION
        const currentVersion = user.tokenVersion || 0;
        const tokenVersion = decoded.tokenVersion || 0;
        if (tokenVersion !== currentVersion) {
            console.log(`[OptionalAuth] Token version mismatch. Token: ${tokenVersion}, DB: ${currentVersion}`);
            return next();
        }

        // ATTACH USER
        req.user = user;
        console.log(`[OptionalAuth] User Attached to Request`);
        next();
    } catch (error) {
        console.log(`[OptionalAuth] Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        next();
    }
};

export default optionalAuth;
