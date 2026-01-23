import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/user.repository';

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface LoginData {
  identifier: string;
  password: string;
}

class AuthService {
  async register(userData: RegisterData) {
    const { name, email, password } = userData;

    const userExists = await userRepository.exists(email);
    if (userExists) {
      throw new Error('User already exists with this email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      name,
      email,
      password: hashedPassword,
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  async login(loginData: LoginData) {
    const { identifier, password } = loginData;

    const user = await userRepository.findByEmail(identifier);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1d' } // ✅ FIXED (no red underline)
    );

    return {
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };
  }
}

export default new AuthService();
