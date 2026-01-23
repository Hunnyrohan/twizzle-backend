import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import registerDTO from '../dto/register.dto';
import loginDTO from '../dto/login.dto';

class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerDTO.parse(req.body);

      const user = await authService.register(validatedData);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginDTO.parse(req.body);

      const result = await authService.login(validatedData);

      res.cookie('token', result.token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
