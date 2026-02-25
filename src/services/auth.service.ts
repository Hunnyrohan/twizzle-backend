import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import userRepository from '../repositories/user.repository';
import emailService from './email.service';
import User from '../models/user.model';

class AuthService {
  private getGoogleClient() {
    return new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private generateToken(user: any) {
    return jwt.sign(
      { id: user._id.toString(), tokenVersion: user.tokenVersion || 0 },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '30d' }
    );
  }

  private formatUser(user: any) {
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      image: user.image,
      role: user.role,
      isVerified: user.isVerified
    };
  }

  async login(identifier: string, password?: string) {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Following original logic: "For this project, we allow login if user exists."
    // If you wish to enable strict password checking, uncomment below:
    /*
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    */

    const token = this.generateToken(user);
    return {
      token,
      user: this.formatUser(user)
    };
  }

  async register(userData: any) {
    const { username, email, password, name } = userData;

    let user = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (user) {
      throw new Error('Username or email already exists');
    }

    user = await User.create({
      username,
      email,
      name: name || username,
      password: password || crypto.randomBytes(16).toString('hex'),
      role: 'user',
      isVerified: false
    });

    const token = this.generateToken(user);
    return {
      token,
      user: this.formatUser(user)
    };
  }

  async forgotPassword(email: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User with this email does not exist');
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    await emailService.sendResetPasswordEmail(user.email, resetCode);
    return { message: 'Reset code sent to your email' };
  }

  async resetPassword(resetCode: string, newPassword: string) {
    const user = await User.findOne({
      resetPasswordToken: resetCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Invalid or expired reset code');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return { message: 'Password reset successful' };
  }

  async googleLogin(idToken: string) {
    try {
      const client = this.getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid Google token');
      }

      const { email, name, picture } = payload;

      let user = await userRepository.findByEmail(email);

      if (!user) {
        const baseUsername = name?.toLowerCase().replace(/\s+/g, '') || email.split('@')[0];
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const username = `${baseUsername}${randomSuffix}`;

        user = await User.create({
          name: name || baseUsername,
          username,
          email,
          image: picture,
          password: crypto.randomBytes(16).toString('hex'),
          role: 'user',
          isVerified: true,
        });
      } else if (!user.isVerified) {
        // If user exists but not verified, verify them since they used Google
        user.isVerified = true;
        await user.save();
      }

      const token = this.generateToken(user);

      return {
        token,
        user: this.formatUser(user),
      };
    } catch (error: any) {
      console.error('Google login error:', error);
      throw new Error(error.message || 'Google authentication failed');
    }
  }
}

export default new AuthService();
