import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { successResponse } from '../utils/response';

// Login: Finds user by username or email
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Identifier and password are required' });
    }

    // Try to find user by username or email
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // In a real app, check password. For this project, we allow login if user exists.
    // If you want to enable password checking, use bcrypt.compare here.

    const token = jwt.sign(
      { id: user._id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return successResponse(res, { token, user });
  } catch (error) {
    next(error);
  }
};

// Register: Creates real user in MongoDB
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, name } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ success: false, error: 'Username, email and password are required' });
    }

    let user = await User.findOne({ username });

    if (user) {
      return res.status(400).json({ success: false, error: 'Username already exists' });
    }

    user = await User.create({
      username,
      email,
      name: name || username,
      password, // Should be hashed in production
      role: 'user'
    });

    const token = jwt.sign(
      { id: user._id, tokenVersion: user.tokenVersion },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );

    return successResponse(res, { token, user });
  } catch (error) {
    next(error);
  }
};
