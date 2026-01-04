const authService = require('../services/auth.service');
const registerDTO = require('../dto/register.dto');
const loginDTO = require('../dto/login.dto');

class AuthController {
  async register(req, res, next) {
    try {
      // Validate request body
      const validatedData = registerDTO.parse(req.body);
      
      // Call service
      const user = await authService.register(validatedData);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      // Validate request body
      const validatedData = loginDTO.parse(req.body);
      
      // Call service
      const result = await authService.login(validatedData);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors
        });
      }
      next(error);
    }
  }
}

module.exports = new AuthController();