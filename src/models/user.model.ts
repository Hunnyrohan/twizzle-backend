import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
  image?: string;
  coverImage?: string;
  bio?: string;
  location?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  privacy: {
    profileVisibility: 'public' | 'private';
    messagePermission: 'everyone' | 'following' | 'nobody';
    mutedWords: string[];
    blockedUsers: string[]; // ObjectIds
  };
  notifications: {
    likes: boolean;
    comments: boolean;
    follows: boolean;
    mentions: boolean;
    messages: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  tokenVersion: number;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    image: { type: String },
    coverImage: { type: String },
    bio: { type: String },
    location: { type: String },
    website: { type: String },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },

    // Settings
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'private'], default: 'public' },
      messagePermission: { type: String, enum: ['everyone', 'following', 'nobody'], default: 'everyone' },
      mutedWords: [String],
      blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }]
    },
    notifications: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      follows: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      messages: { type: Boolean, default: true }
    },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    tokenVersion: { type: Number, default: 0 }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        if (ret.image && !ret.image.startsWith('http')) {
          ret.image = `http://localhost:5000/${ret.image}`;
        }
        if (ret.coverImage && !ret.coverImage.startsWith('http')) {
          ret.coverImage = `http://localhost:5000/${ret.coverImage}`;
        }
        return ret;
      }
    },
    toObject: {
      transform: (doc, ret) => {
        if (ret.image && !ret.image.startsWith('http')) {
          ret.image = `http://localhost:5000/${ret.image}`;
        }
        if (ret.coverImage && !ret.coverImage.startsWith('http')) {
          ret.coverImage = `http://localhost:5000/${ret.coverImage}`;
        }
        return ret;
      }
    }
  }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password);
};

export default model<IUser>('User', userSchema);
