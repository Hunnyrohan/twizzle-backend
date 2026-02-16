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
        // If no currentUserId, just return some popular users
        if (!currentUserId) {
            return await User.find()
                .sort({ followersCount: -1 })
                .limit(5);
        }

        const following = await Follow.find({ follower: new Types.ObjectId(currentUserId) });
        const followingIds = following.map(f => f.following);

        const users = await User.find({
            _id: { $nin: [...followingIds, new Types.ObjectId(currentUserId)] }
        })
            .sort({ followersCount: -1 })
            .limit(5);

        return users.map(u => ({
            ...u.toObject(),
            id: u._id.toString(),
            _id: u._id.toString(),
            displayName: u.name,
            isFollowing: false
        }));
    }

    public async getHotPosts() {
        // Return posts sorted by engagement (likes + reposts)
        // In a real app, we might use a complex formula or time-weighted engagement.
        // For now, let's sum likesCount + retweetsCount
        return await Tweet.find()
            .sort({ likesCount: -1, retweetsCount: -1 })
            .limit(20)
            .populate('author', 'name username image');
    }
}

export const exploreService = new ExploreService();
