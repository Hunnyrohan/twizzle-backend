import Hashtag from '../models/hashtag.model';
import Tweet from '../models/tweet.model';
import User from '../models/user.model';
import Follow from '../models/follow.model';
import { Types } from 'mongoose';

export class ExploreService {
    public async getTrendingHashtags() {
        // Return top 10 hashtags sorted by count desc
        return await Hashtag.find()
            .sort({ count: -1 })
            .limit(10);
    }

    public async getSuggestedCreators(currentUserId?: string) {
        let users: any[];
        if (!currentUserId) {
            users = await User.find({ username: { $nin: ['alice', 'bob'] } })
                .sort({ followersCount: -1 })
                .limit(5);
        } else {
            const following = await Follow.find({ follower: new Types.ObjectId(currentUserId) });
            const followingIds = following.map(f => f.following);

            users = await User.find({
                _id: { $nin: [...followingIds, new Types.ObjectId(currentUserId)] },
                username: { $nin: ['alice', 'bob'] }
            })
                .sort({ followersCount: -1 })
                .limit(5);
        }

        return users.map(u => {
            const uObj = u.toObject ? u.toObject() : u;
            const userId = uObj._id.toString();
            return {
                ...uObj,
                id: userId,
                _id: userId,
                displayName: uObj.name || uObj.displayName,
                avatarUrl: uObj.image || uObj.avatarUrl,
                verified: uObj.isVerified || uObj.verified,
                isFollowing: false
            };
        });
    }

    public async getHotPosts() {
        // Return posts sorted by engagement (likes + reposts)
        const posts = await Tweet.find()
            .sort({ likesCount: -1, retweetsCount: -1, _id: -1 })
            .limit(20)
            .populate('author', 'name username image isVerified');

        return posts.map((p: any) => {
            const itemObj = p.toObject ? p.toObject() : p;
            const itemId = itemObj._id?.toString();

            if (itemObj.author && typeof itemObj.author === 'object') {
                const author = itemObj.author as any;
                const authorId = author._id?.toString();
                author.id = authorId;
                author._id = authorId;
                author.displayName = author.name || author.displayName;
                author.avatarUrl = author.image || author.avatarUrl;
                author.verified = author.isVerified || author.verified;
            }

            return {
                ...itemObj,
                id: itemId,
                _id: itemId
            };
        });
    }

    // Temporary method to seed hashtags from existing tweets
    public async initializeHashtags() {
        const tweets = await Tweet.find({ content: { $regex: '#', $options: 'i' } });
        for (const tweet of tweets) {
            const hashtags = tweet.content.match(/#(\w+)/g);
            if (hashtags) {
                const tags = [...new Set(hashtags.map((h: string) => h.substring(1).toLowerCase()))];
                for (const tag of tags) {
                    await Hashtag.findOneAndUpdate(
                        { tag },
                        { $inc: { count: 1 }, $set: { lastUsed: tweet.createdAt } },
                        { upsert: true }
                    );
                }
            }
        }
    }
}

export const exploreService = new ExploreService();
