import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import authService from '../services/auth.service';
import User from '../models/user.model';

class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { identifier, password, confirmReactivate } = req.body;
      const result = await authService.login(identifier, password, confirmReactivate);

      if (result.needsReactivation) {
        return res.json({
          success: true,
          needsReactivation: true,
          message: result.message
        });
      }

      // Set cookie for browser-based clients
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.register(req.body);
      return successResponse(res, result, 'User registered successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { resetCode, newPassword } = req.body;
      const result = await authService.resetPassword(resetCode, newPassword);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async googleLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { idToken, confirmReactivate } = req.body;
      const result = await authService.googleLogin(idToken, confirmReactivate);

      if (result.needsReactivation) {
        return res.json({
          success: true,
          needsReactivation: true,
          message: result.message
        });
      }

      // Set cookie for browser-based clients
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return successResponse(res, result);
    } catch (error: any) {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      res.clearCookie('token');
      return successResponse(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const userId = (req.user as any)._id || (req.user as any).id;
      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(userId, currentPassword, newPassword);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deactivateAccount(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const userId = (req.user as any)._id || (req.user as any).id;
      const result = await authService.deactivateAccount(userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async logoutAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const userId = (req.user as any)._id || (req.user as any).id;
      const result = await authService.logoutAllSessions(userId);
      return successResponse(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      // @ts-ignore
      const userId = (req.user as any)._id || (req.user as any).id;
      const user = await User.findById(userId).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // We can use userService.mapUser if we want consistent formatting
      // But for now let's just use a simple map or import userService
      const { userService } = require('../services/user.service');
      const mappedUser = userService.mapUser(user, false);

      return successResponse(res, mappedUser);
    } catch (error) {
      next(error);
    }
  }
}

const authController = new AuthController();

export const login = (req: Request, res: Response, next: NextFunction) => authController.login(req, res, next);
export const register = (req: Request, res: Response, next: NextFunction) => authController.register(req, res, next);
export const forgotPassword = (req: Request, res: Response, next: NextFunction) => authController.forgotPassword(req, res, next);
export const resetPassword = (req: Request, res: Response, next: NextFunction) => authController.resetPassword(req, res, next);
export const logout = (req: Request, res: Response, next: NextFunction) => authController.logout(req, res, next);
export const googleLogin = (req: Request, res: Response, next: NextFunction) => authController.googleLogin(req, res, next);
export const changePassword = (req: Request, res: Response, next: NextFunction) => authController.changePassword(req, res, next);
export const deactivateAccount = (req: Request, res: Response, next: NextFunction) => authController.deactivateAccount(req, res, next);
export const logoutAllSessions = (req: Request, res: Response, next: NextFunction) => authController.logoutAllSessions(req, res, next);
export const getMe = (req: Request, res: Response, next: NextFunction) => authController.getMe(req, res, next);

export default authController;
