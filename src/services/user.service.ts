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

        return this.mapUser(user, isFollowing, currentUserId);
    }

    public async findByUsername(username: string, currentUserId?: string): Promise<any | undefined> {
        const user = await User.findOne({ username });
        if (!user) return undefined;

        let isFollowing = false;
        const id = user._id.toString();
        if (currentUserId && currentUserId !== id) {
            const follow = await Follow.findOne({
                follower: new Types.ObjectId(currentUserId),
                following: user._id
            });
            isFollowing = !!follow;
        }

        return this.mapUser(user, isFollowing, currentUserId);
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

    // Helper for auth
    public async createUser(username: string): Promise<any> {
        const newUser = await User.create({
            username,
            name: username,
            email: `${username}@example.com`,
            password: 'password',
            role: 'user',
            image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });
        return this.mapUser(newUser);
    }

    private formatImagePath(path: string | undefined): string | undefined {
        if (!path || typeof path !== 'string') return path;
        const normalized = path.replace(/\\/g, '/');
        const index = normalized.indexOf('uploads/');
        if (index !== -1) {
            return normalized.substring(index);
        }
        return path;
    }

    private mapUser(user: IUser, isFollowing: boolean = false, currentUserId?: string) {
        const image = this.formatImagePath(user.image);
        const coverImage = this.formatImagePath(user.coverImage);
        const id = user._id.toString();
        const isSelf = currentUserId ? currentUserId === id : false;

        const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || user.username || 'User')}&background=random&size=256`;

        return {
            id,
            _id: id,
            username: user.username,
            displayName: user.name,
            name: user.name,
            email: user.email,
            image: image || defaultAvatar,
            avatarUrl: image || defaultAvatar,
            coverImage: coverImage,
            verified: user.isVerified || false,
            isVerified: user.isVerified || false,
            bio: user.bio,
            location: user.location,
            website: user.website,
            followersCount: user.followersCount || 0,
            followingCount: user.followingCount || 0,
            isFollowing,
            isSelf,
            createdAt: (user as any).createdAt,
            tokenVersion: user.tokenVersion || 0
        };
    }

    public async updateAvatar(userId: string, avatarUrl: string): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { image: avatarUrl },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user, false, userId);
    }

    public async updateUser(userId: string, data: Partial<IUser>): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { $set: data },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user, false, userId);
    }

    public async updateCoverImage(userId: string, coverUrl: string): Promise<any> {
        const user = await User.findByIdAndUpdate(
            userId,
            { coverImage: coverUrl },
            { new: true }
        );
        if (!user) throw new Error('User not found');
        return this.mapUser(user, false, userId);
    }

    public async getFollowers(userId: string, currentUserId?: string): Promise<any[]> {
        const follows = await Follow.find({ following: new Types.ObjectId(userId) })
            .populate('follower');

        const followers = follows.map(f => f.follower as any);

        let followingIds: string[] = [];
        if (currentUserId) {
            const userFollowing = await Follow.find({ follower: new Types.ObjectId(currentUserId) }).select('following');
            followingIds = userFollowing.map(f => f.following.toString());
            console.log(`[UserService] getFollowers currentUserId: ${currentUserId}, followingIdsCount: ${followingIds.length}`);
        }

        return followers.map(u => {
            if (!u) return null;
            const cid = u._id.toString();
            const isFollowing = currentUserId
                ? (currentUserId === cid ? false : followingIds.includes(cid))
                : false;
            console.log(`[UserService] Follower: ${u.username}, CID: ${cid}, isFollowing: ${isFollowing}`);
            return this.mapUser(u, isFollowing, currentUserId);
        }).filter(u => u !== null);
    }

    public async getFollowing(userId: string, currentUserId?: string): Promise<any[]> {
        const follows = await Follow.find({ follower: new Types.ObjectId(userId) })
            .populate('following');

        const following = follows.map(f => f.following as any);

        let followingIds: string[] = [];
        if (currentUserId) {
            const userFollowing = await Follow.find({ follower: new Types.ObjectId(currentUserId) }).select('following');
            followingIds = userFollowing.map(f => f.following.toString());
            console.log(`[UserService] getFollowing currentUserId: ${currentUserId}, followingIdsCount: ${followingIds.length}`);
        }

        return following.map(u => {
            if (!u) return null;
            const cid = u._id.toString();
            const isFollowing = currentUserId
                ? (currentUserId === cid ? false : followingIds.includes(cid))
                : false;
            console.log(`[UserService] Following: ${u.username}, CID: ${cid}, isFollowing: ${isFollowing}`);
            return this.mapUser(u, isFollowing, currentUserId);
        }).filter(u => u !== null);
    }
}

export const userService = new UserService();
