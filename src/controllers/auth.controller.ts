import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

export const me = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user || req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    const updateData: any = {
      name: req.body.name,
      email: req.body.email,
    };

    if (req.file) {
      updateData.image = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Profile update failed',
    });
  }
};
