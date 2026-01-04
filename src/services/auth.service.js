const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');

class AuthService {
  async register(userData) {
    const { email, password } = userData;

    // Check if user already exists
    const userExists = await userRepository.exists(email);
    if (userExists) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await userRepository.create({
      email,
      password: hashedPassword
    });

    return {
      id: user._id,
      email: user.email,
      role: user.role
    };
  }

  async login(loginData) {
    const { email, password } = loginData;

    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    };
  }
}

module.exports = new AuthService();