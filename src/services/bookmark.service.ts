import Interaction, { InteractionType } from '../models/interaction.model';
import Tweet from '../models/tweet.model';
import Notification, { NotificationType } from '../models/notification.model';
import { Types } from 'mongoose';
import { enrichTweets } from '../utils/tweet-enrichment';

export class BookmarkService {

    // Toggle bookmark for a user and post
    async toggleBookmark(userId: string, postId: string) {
        const post = await Tweet.findById(postId);
        if (!post) throw new Error('Post not found');

        const existingInteraction = await Interaction.findOne({
            user: new Types.ObjectId(userId),
            tweet: new Types.ObjectId(postId),
            type: InteractionType.BOOKMARK
        });

        if (existingInteraction) {
            await Interaction.deleteOne({ _id: existingInteraction._id });
            return { isBookmarked: false };
        } else {
            await Interaction.create({
                user: new Types.ObjectId(userId),
                tweet: new Types.ObjectId(postId),
                type: InteractionType.BOOKMARK
            });

            // Create bookmark notification
            if (post.author.toString() !== userId.toString()) {
                await Notification.create({
                    recipientId: post.author,
                    actorId: new Types.ObjectId(userId),
                    type: NotificationType.BOOKMARK,
                    postId: post._id
                });
            }

            return { isBookmarked: true };
        }
    }

    // Get bookmarked posts with pagination
    async getBookmarks(userId: string, cursor?: string, limit: number = 10) {
        const query: any = {
            user: new Types.ObjectId(userId),
            type: InteractionType.BOOKMARK
        };

        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) };
        }

        const interactions = await Interaction.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1)
            .populate({
                path: 'tweet',
                populate: {
                    path: 'author',
                    select: 'name username image'
                }
            });

        const hasNextPage = interactions.length > limit;
        const items = hasNextPage ? interactions.slice(0, limit) : interactions;

        const tweets = items.map(interaction => interaction.tweet).filter(t => !!t);
        const enrichedTweets = await enrichTweets(tweets, userId);

        const nextCursor = hasNextPage ? items[items.length - 1]._id : null;

        return {
            items: enrichedTweets,
            nextCursor
        };
    }

    // Helper to check if a specific post is bookmarked by user
    async isBookmarked(userId: string, postId: string) {
        const interaction = await Interaction.findOne({
            user: new Types.ObjectId(userId),
            tweet: new Types.ObjectId(postId),
            type: InteractionType.BOOKMARK
        });
        return !!interaction;
    }
}

export const bookmarkService = new BookmarkService();
