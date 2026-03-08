import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import userRepository from '../repositories/user.repository';
import emailService from './email.service';
import User from '../models/user.model';

function throwWithStatus(message: string, statusCode: number = 400): never {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  throw error;
}

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
    let image = user.image;
    if (image && typeof image === 'string' && image.includes('/uploads/')) {
      image = image.substring(image.indexOf('uploads/'));
    }
    let coverImage = user.coverImage;
    if (coverImage && typeof coverImage === 'string' && coverImage.includes('/uploads/')) {
      coverImage = coverImage.substring(coverImage.indexOf('uploads/'));
    }
    return {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      username: user.username,
      email: user.email,
      image: image,
      coverImage: coverImage,
      bio: user.bio,
      location: user.location,
      website: user.website,
      role: user.role,
      isVerified: user.isVerified,
      verifiedAt: user.verifiedAt,
      followersCount: user.followersCount || 0,
      followingCount: user.followingCount || 0,
      createdAt: user.createdAt,
    };
  }

  async login(identifier: string, password?: string, confirmReactivate: boolean = false) {
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });

    if (!user) {
      throwWithStatus('Invalid credentials', 401);
    }

    if (user.isActive === false) {
      if (confirmReactivate) {
        user.isActive = true;
        await user.save();
      } else {
        return {
          needsReactivation: true,
          message: 'Account is deactivated. Would you like to reactivate it?'
        };
      }
    }

    const isValid = await user.comparePassword(password || '');
    if (!isValid) {
      throwWithStatus('Invalid credentials', 401);
    }

    const token = this.generateToken(user);
    return {
      token,
      user: this.formatUser(user)
    };
  }

  async register(userData: any) {
    const { username, email, password, name } = userData;

    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      throwWithStatus('Username or email already exists', 400);
    }

    const user = await User.create({
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
      throwWithStatus('User with this email does not exist', 404);
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    try {
      await emailService.sendResetPasswordEmail(user.email, resetCode);
    } catch (e) {
      console.error('Email sending failed:', e);
      // In test ENV, don't fail the whole request
      if (process.env.NODE_ENV !== 'test') throw e;
    }
    return { message: 'Reset code sent to your email' };
  }

  async resetPassword(resetCode: string, newPassword: string) {
    const user = await User.findOne({
      resetPasswordToken: resetCode,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      throwWithStatus('Invalid or expired reset code', 400);
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    return { message: 'Password reset successful' };
  }

  async googleLogin(idToken: string, confirmReactivate: boolean = false) {
    try {
      const client = this.getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throwWithStatus('Invalid Google token', 401);
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
          isActive: true,
          isVerified: false,
        });
      } else {
        // Check deactivation
        if (user.isActive === false) {
          if (confirmReactivate) {
            user.isActive = true;
            await user.save();
          } else {
            return {
              needsReactivation: true,
              message: 'Account is deactivated. Would you like to reactivate it?',
            };
          }
        }
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

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select('+password');
    if (!user) throwWithStatus('User not found', 404);

    const isValid = await user!.comparePassword(currentPassword);
    if (!isValid) throwWithStatus('Invalid current password', 401);

    const salt = await bcrypt.genSalt(10);
    user!.password = await bcrypt.hash(newPassword, salt);
    user!.tokenVersion = (user!.tokenVersion || 0) + 1;
    await user!.save();

    return { message: 'Password updated successfully. All other sessions invalidated.' };
  }

  async deactivateAccount(userId: string) {
    const user = await User.findById(userId);
    if (!user) throwWithStatus('User not found', 404);

    user!.isActive = false;
    user!.tokenVersion = (user!.tokenVersion || 0) + 1;
    await user!.save();

    return { message: 'Account deactivated successfully' };
  }

  async logoutAllSessions(userId: string) {
    const user = await User.findById(userId);
    if (!user) throwWithStatus('User not found', 404);

    user!.tokenVersion = (user!.tokenVersion || 0) + 1;
    await user!.save();

    return { message: 'Successfully logged out from all other devices' };
  }
}

export default new AuthService();
