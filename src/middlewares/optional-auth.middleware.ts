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
        let token = req.cookies?.token;

        if (!token && req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return next(); // Proceed without req.user
        }

        // VERIFY TOKEN
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET as string
        ) as { id: string; tokenVersion?: number };

        // GET USER
        const user = await User.findById(decoded.id).lean<IUser>();

        if (!user) {
            return next(); // Proceed without req.user
        }

        // CHECK TOKEN VERSION
        const currentVersion = user.tokenVersion || 0;
        const tokenVersion = decoded.tokenVersion || 0;
        if (tokenVersion !== currentVersion) {
            return next(); // Proceed without req.user
        }

        // ATTACH USER
        req.user = user;
        next();
    } catch (error) {
        // On error (expired token etc.), still proceed but without req.user
        next();
    }
};

export default optionalAuth;
