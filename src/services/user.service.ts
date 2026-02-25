import User, { IUser } from '../models/user.model';
import Follow from '../models/follow.model';
import Notification, { NotificationType } from '../models/notification.model';
import { Types } from 'mongoose';

export class UserService {
    public async findById(id: string, currentUserId?: string): Promise<any | undefined> {
        const user = await User.findById(id);
        if (!user) return undefined;

        let isFollowing = false;
        if (currentUserId && currentUserId !== id) {
            const follow = await Follow.findOne({
                follower: new Types.ObjectId(currentUserId),
                following: new Types.ObjectId(id)
            });
            isFollowing = !!follow;
        }

        return this.mapUser(user, isFollowing);
    }

    public async findByUsername(username: string, currentUserId?: string): Promise<any | undefined> {
        const user = await User.findOne({ username });
        if (!user) return undefined;

        let isFollowing = false;
        if (currentUserId && currentUserId !== user._id.toString()) {
            const follow = await Follow.findOne({
                follower: new Types.ObjectId(currentUserId),
                following: user._id
            });
            isFollowing = !!follow;
        }

        return this.mapUser(user, isFollowing);
    }

    public async toggleFollow(followerId: string, followingId: string): Promise<{ isFollowing: boolean }> {
        const existingFollow = await Follow.findOne({
            follower: new Types.ObjectId(followerId),
            following: new Types.ObjectId(followingId)
        });

        if (existingFollow) {
            await Follow.deleteOne({ _id: existingFollow._id });

            // Update counts
            await User.findByIdAndUpdate(followerId, { $inc: { followingCount: -1 } });
            await User.findByIdAndUpdate(followingId, { $inc: { followersCount: -1 } });

            return { isFollowing: false };
        } else {
            await Follow.create({
                follower: new Types.ObjectId(followerId),
                following: new Types.ObjectId(followingId)
            });

            // Update counts
            await User.findByIdAndUpdate(followerId, { $inc: { followingCount: 1 } });
            await User.findByIdAndUpdate(followingId, { $inc: { followersCount: 1 } });

            // Create follow notification
            await Notification.findOneAndUpdate(
                {
                    recipientId: new Types.ObjectId(followingId),
                    actorId: new Types.ObjectId(followerId),
                    type: NotificationType.FOLLOW
                },
                {
                    recipientId: new Types.ObjectId(followingId),
                    actorId: new Types.ObjectId(followerId),
                    type: NotificationType.FOLLOW,
                    isRead: false
                },
                { upsert: true, new: true }
            );

            return { isFollowing: true };
        }
    }

    // Helper for auth (kept for compatibility if needed, but auth.controller uses User model directly now)
    public async createUser(username: string): Promise<any> {
        const newUser = await User.create({
            username,
            name: username,
            email: `${username}@example.com`,
            password: 'password', // Default
            role: 'user',
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });
        return this.mapUser(newUser);
    }

    private mapUser(user: IUser, isFollowing: boolean = false) {
        return {
            id: user._id.toString(),
            _id: user._id.toString(), // Ensure both id and _id are available
            username: user.username,
            displayName: user.name, // Map name to displayName
            name: user.name,
            email: user.email,
            image: user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`, // Provide 'image' for frontend compatibility
            avatarUrl: user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`, // Keep avatarUrl for safety
            coverImage: user.coverImage,
            verified: user.isVerified || false,
            isVerified: user.isVerified || false,
            bio: user.bio,
            location: user.location,
            website: user.website,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            isFollowing, // Return the status
            createdAt: (user as any).createdAt,
            tokenVersion: user.tokenVersion
        };
    }

    public async updateAvatar(userId: string, avatarUrl: string): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { image: avatarUrl },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user);
    }

    public async updateUser(userId: string, data: Partial<IUser>): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user);
    }

    public async updateCoverImage(userId: string, coverUrl: string): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { coverImage: coverUrl },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user);
    }

    public async getFollowers(userId: string): Promise<any[]> {
        const follows = await Follow.find({ following: new Types.ObjectId(userId) })
            .populate('follower');

        return follows.map(f => this.mapUser(f.follower as any));
    }

    public async getFollowing(userId: string): Promise<any[]> {
        const follows = await Follow.find({ follower: new Types.ObjectId(userId) })
            .populate('following');

        return follows.map(f => this.mapUser(f.following as any));
    }
}

export const userService = new UserService();
