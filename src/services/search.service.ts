import User from '../models/user.model';
import Tweet from '../models/tweet.model';
import Hashtag from '../models/hashtag.model';
import Follow from '../models/follow.model';
import { Types } from 'mongoose';

interface SearchParams {
    query: string;
    filter: 'top' | 'latest' | 'people' | 'media' | 'tags';
    cursor?: string;
    limit?: number;
    currentUserId?: string;
}

interface SearchResult {
    items: any[];
    nextCursor?: string;
}

export class SearchService {
    public async search({ query, filter, cursor, limit = 10, currentUserId }: SearchParams): Promise<SearchResult> {
        const q = query.trim();
        if (!q) return { items: [], nextCursor: undefined };

        let items: any[] = [];
        let nextCursor: string | undefined;

        switch (filter) {
            case 'people': {
                const searchCriteria: any = {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { name: { $regex: q, $options: 'i' } }
                    ]
                };
                if (cursor) searchCriteria._id = { $gt: new Types.ObjectId(cursor) };

                items = await User.find(searchCriteria)
                    .sort({ _id: 1 })
                    .limit(limit + 1);
                break;
            }

            case 'tags': {
                const searchCriteria: any = {
                    tag: { $regex: q, $options: 'i' }
                };
                if (cursor) searchCriteria._id = { $gt: new Types.ObjectId(cursor) };

                items = await Hashtag.find(searchCriteria)
                    .sort({ _id: 1 })
                    .limit(limit + 1);
                break;
            }

            case 'media': {
                const searchCriteria: any = {
                    media: { $exists: true, $not: { $size: 0 } },
                    content: { $regex: q, $options: 'i' }
                };
                if (cursor) searchCriteria._id = { $lt: new Types.ObjectId(cursor) };

                items = await Tweet.find(searchCriteria)
                    .sort({ _id: -1 })
                    .limit(limit + 1)
                    .populate('author', 'name username image');
                break;
            }

            case 'latest': {
                const searchCriteria: any = {
                    content: { $regex: q, $options: 'i' }
                };
                if (cursor) searchCriteria._id = { $lt: new Types.ObjectId(cursor) };

                items = await Tweet.find(searchCriteria)
                    .sort({ _id: -1 })
                    .limit(limit + 1)
                    .populate('author', 'name username image');
                break;
            }

            case 'top':
            default: {
                // For 'top', we return a mix of relevant people and popular tweets
                const userCriteria = {
                    $or: [
                        { username: { $regex: q, $options: 'i' } },
                        { name: { $regex: q, $options: 'i' } }
                    ]
                };

                const tweetCriteria = {
                    content: { $regex: q, $options: 'i' }
                };

                // Fetch top 3 matching users
                const topUsers = await User.find(userCriteria).limit(3);

                // Fetch tweets sorted by engagement
                const tweets = await Tweet.find(tweetCriteria)
                    .sort({ likesCount: -1, _id: -1 })
                    .limit(limit + 1)
                    .populate('author', 'name username image');

                items = [...topUsers, ...tweets];
                break;
            }
        }

        const hasNextPage = items.length > limit;
        const resultItems = hasNextPage ? items.slice(0, limit) : items;

        // Transform results to match frontend expectations and add follow status
        const transformedItems = await Promise.all(resultItems.map(async (item) => {
            const itemObj = (item.toObject ? item.toObject({ virtuals: true }) : item);
            const itemId = itemObj._id?.toString() || itemObj.id?.toString();

            // Handle User mapping (either as a search result or as a populated author)
            const isUser = itemObj.username && !itemObj.content;

            if (isUser) {
                const isFollowing = currentUserId
                    ? !!(await Follow.findOne({ follower: currentUserId, following: itemObj._id }))
                    : false;

                return {
                    id: itemId,
                    _id: itemId,
                    username: itemObj.username,
                    displayName: itemObj.name || itemObj.displayName,
                    avatarUrl: itemObj.image || itemObj.avatarUrl,
                    bio: itemObj.bio,
                    verified: itemObj.isVerified || itemObj.verified,
                    isFollowing
                };
            }

            // Handle Hashtag mapping
            if (itemObj.tag && !itemObj.content) {
                return {
                    id: itemId,
                    _id: itemId,
                    tag: itemObj.tag,
                    count: itemObj.count || 0
                };
            }

            // Handle Post mapping
            if (itemObj.content) {
                // If author is populated, ensure it also has the right fields for UserCard (though PostCard uses it)
                if (itemObj.author && typeof itemObj.author === 'object') {
                    const authorId = itemObj.author._id?.toString() || itemObj.author.id?.toString();
                    itemObj.author.id = authorId;
                    itemObj.author._id = authorId;
                    itemObj.author.displayName = itemObj.author.name || itemObj.author.displayName;
                    itemObj.author.avatarUrl = itemObj.author.image || itemObj.author.avatarUrl;
                    itemObj.author.verified = itemObj.author.isVerified || itemObj.author.verified;
                }
                return {
                    ...itemObj,
                    id: itemId,
                    _id: itemId
                };
            }

            return { ...itemObj, id: itemId, _id: itemId };
        }));

        if (hasNextPage) {
            nextCursor = resultItems[resultItems.length - 1]._id.toString();
        }

        return { items: transformedItems, nextCursor };
    }
}

export const searchService = new SearchService();
