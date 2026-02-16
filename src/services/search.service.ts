import User from '../models/user.model';
import Tweet from '../models/tweet.model';
import Hashtag from '../models/hashtag.model';
import { Types } from 'mongoose';

interface SearchParams {
    query: string;
    filter: 'top' | 'latest' | 'people' | 'media' | 'tags';
    cursor?: string;
    limit?: number;
}

interface SearchResult {
    items: any[];
    nextCursor?: string;
}

export class SearchService {
    public async search({ query, filter, cursor, limit = 10 }: SearchParams): Promise<SearchResult> {
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
                const searchCriteria: any = {
                    content: { $regex: q, $options: 'i' }
                };
                // For 'top', we ideally want engagement sorting.
                // Cursor pagination with non-unique sorts is harder.
                // Let's use likesCount for 'top' but it might need skip/limit if not using ID.
                // For simplicity, let's just sort by likesCount desc
                items = await Tweet.find(searchCriteria)
                    .sort({ likesCount: -1, _id: -1 })
                    .limit(limit + 1)
                    .populate('author', 'name username image');
                break;
            }
        }

        const hasNextPage = items.length > limit;
        const resultItems = hasNextPage ? items.slice(0, limit) : items;

        if (hasNextPage) {
            nextCursor = resultItems[resultItems.length - 1]._id.toString();
        }

        return { items: resultItems, nextCursor };
    }
}

export const searchService = new SearchService();
