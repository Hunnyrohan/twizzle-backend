import { Request, Response } from 'express';
import Tweet from '../models/tweet.model';
import User from '../models/user.model';
import Interaction, { InteractionType } from '../models/interaction.model'; // Added missing import
import Notification, { NotificationType } from '../models/notification.model';
import { upload } from '../config/multer.config';
import { enrichTweets } from '../utils/tweet-enrichment';

export const createTweet = async (req: Request, res: Response) => {
    try {
        const { content, parentTweet, location } = req.body;

        let mediaFiles: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            mediaFiles = (req.files as Express.Multer.File[]).map((file) => file.filename);
        }

        if (!content && mediaFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Tweet content or media is required',
            });
        }

        const tweet = await Tweet.create({
            content,
            author: (req.user as any)._id,
            media: mediaFiles,
            parentTweet,
            location,
        });

        if (parentTweet) {
            const originalTweet = await Tweet.findByIdAndUpdate(parentTweet, { $inc: { repliesCount: 1 } });

            // Create comment notification
            if (originalTweet && originalTweet.author.toString() !== (req.user as any)._id.toString()) {
                await Notification.create({
                    recipientId: originalTweet.author,
                    actorId: (req.user as any)._id,
                    type: NotificationType.COMMENT,
                    postId: originalTweet._id,
                    commentText: content
                });
            }
        }

        // Mention detection (@username)
        const mentions = content.match(/@(\w+)/g);
        if (mentions) {
            const usernames = mentions.map((m: string) => m.substring(1));
            const mentionedUsers = await User.find({ username: { $in: usernames } });

            for (const mentionedUser of mentionedUsers) {
                if (mentionedUser._id.toString() !== (req.user as any)._id.toString()) {
                    await Notification.create({
                        recipientId: mentionedUser._id,
                        actorId: (req.user as any)._id,
                        type: NotificationType.MENTION,
                        postId: tweet._id
                    });
                }
            }
        }

        // Hashtag detection (#tag)
        const hashtags = content.match(/#(\w+)/g);
        if (hashtags) {
            const tags: string[] = [...new Set(hashtags.map((h: string) => h.substring(1).toLowerCase()) as string[])];
            const HashtagModel = require('../models/hashtag.model').default;
            for (const tag of tags) {
                await HashtagModel.findOneAndUpdate(
                    { tag },
                    {
                        $inc: { count: 1 },
                        $set: { lastUsed: new Date() }
                    },
                    { upsert: true, new: true }
                );
            }
        }

        const populatedTweet: any = await tweet.populate('author', 'name username image isVerified');
        const enrichedArray = await enrichTweets([populatedTweet], (req.user as any)._id.toString());
        const enrichedTweet = enrichedArray[0];

        return res.status(201).json({
            success: true,
            data: enrichedTweet
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create tweet',
            error: (error as Error).message,
        });
    }
};

import Follow from '../models/follow.model';

export const getFeed = async (req: Request, res: Response) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const { author, filter } = req.query;
        let matchQuery: any = {};
        let blockedIdStrings: string[] = [];

        if (req.user) {
            // Fetch blocked users and not interested tweets to exclude them
            const currentUser = await User.findById((req.user as any)._id).select('privacy.blockedUsers privacy.notInterestedTweets');
            const blockedIds = currentUser?.privacy?.blockedUsers || [];
            const notInterestedIds = (currentUser?.privacy as any)?.notInterestedTweets || [];
            blockedIdStrings = blockedIds.map((id: any) => id.toString());

            // If a specific author profile is requested
            if (author) {
                if (blockedIdStrings.includes(author.toString())) {
                    matchQuery.author = { $in: [] }; // Blocked: return nothing
                } else {
                    matchQuery.author = author;
                }
            } else {
                // Main Feed: Include own tweets and following
                const following = await Follow.find({ follower: (req.user as any)._id }).select('following');
                const followingIds = following.map(f => f.following);
                followingIds.push((req.user as any)._id);

                matchQuery.author = {
                    $in: followingIds,
                    $nin: blockedIds
                };
            }

            // Exclude Not Interested tweets
            if (notInterestedIds.length > 0) {
                matchQuery._id = { $nin: notInterestedIds };
            }
        } else if (author) {
            // Unauthenticated: only filter by author if provided
            matchQuery.author = author;
        }

        // Apply filters (replies/media/posts)
        if (filter === 'replies') {
            matchQuery.parentTweet = { $ne: null };
        } else if (filter === 'media') {
            matchQuery.media = { $not: { $size: 0 } };
        } else {
            // Default 'posts' filter: only show root tweets
            matchQuery.parentTweet = null;
        }

        const tweets = await Tweet.find(matchQuery)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'name username image')
            .populate({
                path: 'retweetOf',
                populate: { path: 'author', select: 'name username image' }
            });

        const enrichedTweets = await enrichTweets(tweets, (req.user as any)?._id?.toString() || null);

        // Strict in-memory filter to catch retweets of blocked users
        let finalTweets = enrichedTweets;
        if (blockedIdStrings.length > 0) {
            finalTweets = enrichedTweets.filter((tweet: any) => {
                const authorId = tweet.author?._id?.toString() || tweet.author?.id?.toString();
                if (authorId && blockedIdStrings.includes(authorId)) return false;

                if (tweet.retweetOf?.author) {
                    const originalAuthorId = tweet.retweetOf.author._id?.toString() || tweet.retweetOf.author.id?.toString();
                    if (originalAuthorId && blockedIdStrings.includes(originalAuthorId)) return false;
                }
                return true;
            });
        }

        return res.status(200).json({
            success: true,
            data: finalTweets,
        });
    } catch (error) {
        console.error('Get Feed Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch feed',
        });
    }
};

export const getTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tweet = await Tweet.findById(id)
            .populate('author', 'name username image')
            .populate({
                path: 'parentTweet',
                populate: { path: 'author', select: 'name username image' }
            });

        if (!tweet) {
            return res.status(404).json({
                success: false,
                message: 'Tweet not found',
            });
        }

        const [enrichedArray] = await Promise.all([
            enrichTweets([tweet], (req as any).user?._id?.toString() || null)
        ]);
        const enrichedTweet = enrichedArray[0];

        return res.status(200).json({
            success: true,
            data: enrichedTweet,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch tweet',
        });
    }
};

export const getTweetComments = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { cursor, limit = 10 } = req.query;
        const limitNum = parseInt(limit as string);

        let query: any = { parentTweet: id };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const comments = await Tweet.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum + 1)
            .populate('author', 'name username image');

        const hasMore = comments.length > limitNum;
        const nextCursor = hasMore ? comments[limitNum - 1]._id : null;
        const data = hasMore ? comments.slice(0, limitNum) : comments;

        const enrichedComments = await enrichTweets(data, (req as any).user?._id?.toString() || null);

        return res.status(200).json({
            success: true,
            data: {
                items: enrichedComments,
                nextCursor
            },
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch comments',
        });
    }
};

export const createComment = async (req: Request, res: Response) => {
    try {
        const { id: parentTweetId } = req.params;
        const { content } = req.body;
        const userId = (req.user as any)._id;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required',
            });
        }

        console.log(`Creating comment on tweet ${parentTweetId} by user ${userId}`);

        const comment = await Tweet.create({
            content,
            author: userId,
            parentTweet: parentTweetId,
        });

        const originalTweet = await Tweet.findByIdAndUpdate(parentTweetId, { $inc: { repliesCount: 1 } });

        // Create comment notification
        if (originalTweet && originalTweet.author.toString() !== userId.toString()) {
            await Notification.create({
                recipientId: originalTweet.author,
                actorId: userId,
                type: NotificationType.COMMENT,
                postId: parentTweetId,
                commentText: content
            });
        }

        // Mention detection (@username) in comments
        const mentions = content.match(/@(\w+)/g);
        if (mentions) {
            const usernames = mentions.map((m: string) => m.substring(1));
            const mentionedUsers = await User.find({ username: { $in: usernames } });

            for (const mentionedUser of mentionedUsers) {
                if (mentionedUser._id.toString() !== userId.toString()) {
                    await Notification.create({
                        recipientId: mentionedUser._id,
                        actorId: userId,
                        type: NotificationType.MENTION,
                        postId: comment._id
                    });
                }
            }
        }

        // Hashtag detection (#tag) in comments
        const hashtags = content.match(/#(\w+)/g);
        if (hashtags) {
            const tags: string[] = [...new Set(hashtags.map((h: string) => h.substring(1).toLowerCase()) as string[])];
            const HashtagModel = require('../models/hashtag.model').default;
            for (const tag of tags) {
                await HashtagModel.findOneAndUpdate(
                    { tag },
                    {
                        $inc: { count: 1 },
                        $set: { lastUsed: new Date() }
                    },
                    { upsert: true, new: true }
                );
            }
        }

        const populatedComment: any = await comment.populate('author', 'name username image isVerified');

        // Enrich the single comment using the utility
        const enrichedArray = await enrichTweets([populatedComment], userId.toString());
        const enrichedComment = enrichedArray[0];

        return res.status(201).json({
            success: true,
            data: enrichedComment
        });
    } catch (error) {
        console.error('Create Comment Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create comment',
            error: (error as Error).message
        });
    }
};

export const deleteTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req.user as any)?._id?.toString();

        if (!id || id === 'undefined') {
            return res.status(400).json({ success: false, message: 'Invalid tweet ID' });
        }

        const tweet = await Tweet.findById(id);

        if (!tweet) {
            return res.status(404).json({
                success: false,
                message: 'Tweet not found',
            });
        }

        const authorId = tweet.author.toString();

        if (authorId !== userId) {
            console.log(`Delete forbidden: Author ${authorId} vs User ${userId}`);
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own tweets',
            });
        }

        await Tweet.findByIdAndDelete(id);

        if (tweet.parentTweet) {
            await Tweet.findByIdAndUpdate(tweet.parentTweet, { $inc: { repliesCount: -1 } });
        }

        return res.status(200).json({
            success: true,
            message: 'Tweet deleted successfully',
        });
    } catch (error) {
        console.error('Delete Tweet Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete tweet',
            error: (error as Error).message
        });
    }
};


import { Types } from 'mongoose';

export const likeTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const existingLike = await Interaction.findOne({
            user: userId,
            tweet: id,
            type: InteractionType.LIKE,
        });

        if (existingLike) {
            return res.status(200).json({
                success: true,
                message: 'Tweet already liked',
            });
        }

        await Interaction.create({
            user: userId,
            tweet: id,
            type: InteractionType.LIKE,
        });

        const tweet = await Tweet.findByIdAndUpdate(id, { $inc: { likesCount: 1 } });

        // Create like notification
        if (tweet && tweet.author.toString() !== userId.toString()) {
            await Notification.findOneAndUpdate(
                {
                    recipientId: tweet.author,
                    actorId: userId,
                    type: NotificationType.LIKE,
                    postId: id
                },
                {
                    recipientId: tweet.author,
                    actorId: userId,
                    type: NotificationType.LIKE,
                    postId: id,
                    isRead: false
                },
                { upsert: true, new: true }
            );
        }

        return res.status(200).json({
            success: true,
            message: 'Tweet liked',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to like tweet',
        });
    }
};

export const unlikeTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user._id;

        const result = await Interaction.findOneAndDelete({
            user: userId,
            tweet: id,
            type: InteractionType.LIKE,
        });

        if (!result) {
            return res.status(200).json({
                success: true,
                message: 'Tweet already unliked',
            });
        }

        await Tweet.findByIdAndUpdate(id, { $inc: { likesCount: -1 } });

        return res.status(200).json({
            success: true,
            message: 'Tweet unliked',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to unlike tweet',
        });
    }
};

export const retweet = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        const userId = (req as any).user._id;

        // Resolve canonical tweet (if user clicks repost on a retweet, use the original)
        let targetTweet = await Tweet.findById(id);
        if (!targetTweet) {
            return res.status(404).json({ success: false, message: 'Tweet not found' });
        }
        if (targetTweet.retweetOf) {
            id = targetTweet.retweetOf.toString();
            targetTweet = await Tweet.findById(id);
            if (!targetTweet) {
                return res.status(404).json({ success: false, message: 'Original tweet not found' });
            }
        }

        const existingInteraction = await Interaction.findOne({
            user: userId,
            tweet: id,
            type: InteractionType.RETWEET,
        });

        // TOGGLE: if interaction exists, undo the retweet
        if (existingInteraction) {
            await Interaction.findByIdAndDelete(existingInteraction._id);
            // Clean up any retweet tweet objects (handle stale ones too)
            await Tweet.deleteMany({ author: userId, retweetOf: id });
            await Tweet.findByIdAndUpdate(id, { $inc: { retweetsCount: -1 } });
            return res.status(200).json({ success: true, message: 'Retweet removed', isRetweeted: false });
        }

        // Otherwise, create the retweet
        await Interaction.create({ user: userId, tweet: id, type: InteractionType.RETWEET });
        const newTweet = await Tweet.create({ author: userId, retweetOf: id });
        await Tweet.findByIdAndUpdate(id, { $inc: { retweetsCount: 1 } });

        if (targetTweet.author.toString() !== userId.toString()) {
            await Notification.findOneAndUpdate(
                { recipientId: targetTweet.author, actorId: userId, type: NotificationType.REPOST, postId: id },
                { recipientId: targetTweet.author, actorId: userId, type: NotificationType.REPOST, postId: id, isRead: false },
                { upsert: true, new: true }
            );
        }

        const populatedTweet = await newTweet.populate('author', 'name username image');
        await populatedTweet.populate('retweetOf');

        return res.status(201).json({ success: true, message: 'Tweet retweeted', isRetweeted: true, data: populatedTweet });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to retweet' });
    }
};

export const unretweet = async (req: Request, res: Response) => {
    try {
        let { id } = req.params;
        const userId = (req as any).user._id;

        const targetTweet = await Tweet.findById(id);
        if (!targetTweet) {
            return res.status(404).json({
                success: false,
                message: 'Tweet not found',
            });
        }

        // Canonical ID resolution
        const canonicalId = targetTweet.retweetOf ? targetTweet.retweetOf.toString() : id;

        const existingRetweet = await Interaction.findOne({
            user: userId,
            tweet: canonicalId,
            type: InteractionType.RETWEET,
        });

        if (!existingRetweet) {
            return res.status(400).json({
                success: false,
                message: 'You have not retweeted this tweet',
            });
        }

        // Delete interaction from canonical tweet
        await Interaction.findByIdAndDelete(existingRetweet._id);

        // Delete the retweet tweet object(s) by this user for this canonical tweet
        await Tweet.deleteMany({
            author: userId,
            retweetOf: canonicalId,
        });

        // Decrement count on canonical tweet
        await Tweet.findByIdAndUpdate(canonicalId, { $inc: { retweetsCount: -1 } });

        return res.status(200).json({
            success: true,
            message: 'Retweet removed',
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to remove retweet',
        });
    }
};

export const searchTweets = async (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required',
            });
        }

        const tweets = await Tweet.find({
            content: { $regex: q, $options: 'i' },
            parentTweet: null, // Only search root tweets? Or all? Let's say all but maybe prefer root.
        })
            .populate('author', 'name username image')
            .sort({ createdAt: -1 })
            .limit(20);

        const enrichedTweets = await enrichTweets(tweets, req.user?._id?.toString() || null);

        return res.status(200).json({
            success: true,
            data: enrichedTweets,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Search failed',
        });
    }
};
export const getUserLikedTweets = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const interactions = await Interaction.find({
            user: user._id,
            type: InteractionType.LIKE
        })
            .sort({ createdAt: -1 })
            .populate({
                path: 'tweet',
                populate: { path: 'author', select: 'name username image' }
            });

        const tweets = interactions.map(i => i.tweet).filter(t => t !== null);
        const enrichedTweets = await enrichTweets(tweets, (req.user as any)?._id?.toString() || null);
        return res.status(200).json({ success: true, data: enrichedTweets });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
};

export const getUserTweets = async (req: Request, res: Response) => {
    try {
        const { username } = req.params;
        const { filter } = req.query;
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        let matchQuery: any = { author: user._id };

        // Apply filters (replies/media/posts)
        if (filter === 'replies') {
            matchQuery.parentTweet = { $ne: null };
        } else if (filter === 'media') {
            matchQuery.media = { $not: { $size: 0 } };
        } else {
            // Default 'posts' filter: only show root tweets
            matchQuery.parentTweet = null;
        }

        const tweets = await Tweet.find(matchQuery)
            .sort({ createdAt: -1 })
            .populate('author', 'name username image isVerified');

        const enrichedTweets = await enrichTweets(tweets, (req.user as any)?._id?.toString() || null);

        return res.status(200).json({
            success: true,
            data: enrichedTweets
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch user tweets',
            error: error.message
        });
    }
};
