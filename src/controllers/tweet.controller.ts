import { Request, Response } from 'express';
import Tweet from '../models/tweet.model';
import User from '../models/user.model';
import Notification, { NotificationType } from '../models/notification.model';
import { upload } from '../config/multer.config';
import { enrichTweets } from '../utils/tweet-enrichment';

export const createTweet = async (req: Request, res: Response) => {
    try {
        const { content, parentTweet } = req.body;

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

        const populatedTweet = await tweet.populate('author', 'name username image');

        return res.status(201).json({
            success: true,
            data: populatedTweet,
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

        let matchQuery: any = { parentTweet: null };

        if (req.query.author) {
            matchQuery.author = req.query.author;
        } else if (req.user) {
            const following = await Follow.find({ follower: req.user._id }).select('following');
            const followingIds = following.map(f => f.following);
            followingIds.push(req.user._id); // Include own tweets

            matchQuery.author = { $in: followingIds };
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

        const enrichedTweets = await enrichTweets(tweets, req.user?._id?.toString() || null);

        return res.status(200).json({
            success: true,
            data: enrichedTweets,
        });
    } catch (error) {
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

        let isLiked = false;
        let isRetweeted = false;

        if ((req as any).user) {
            const [likeParams, retweetParams] = await Promise.all([
                Interaction.exists({ user: (req as any).user._id, tweet: id, type: InteractionType.LIKE }),
                Interaction.exists({ user: (req as any).user._id, tweet: id, type: InteractionType.RETWEET })
            ]);
            isLiked = !!likeParams;
            isRetweeted = !!retweetParams;
        }

        return res.status(200).json({
            success: true,
            data: {
                ...tweet.toObject(),
                isLiked,
                isRetweeted
            },
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
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({
                success: false,
                message: 'Comment content is required',
            });
        }

        const comment = await Tweet.create({
            content,
            author: req.user._id,
            parentTweet: id,
        });

        const originalTweet = await Tweet.findByIdAndUpdate(id, { $inc: { repliesCount: 1 } });

        // Create comment notification
        if (originalTweet && originalTweet.author.toString() !== (req.user as any)._id.toString()) {
            await Notification.create({
                recipientId: originalTweet.author,
                actorId: (req.user as any)._id,
                type: NotificationType.COMMENT,
                postId: id,
                commentText: content
            });
        }

        const populatedComment = await comment.populate('author', 'name username image');

        return res.status(201).json({
            success: true,
            data: populatedComment,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to create comment',
        });
    }
};

export const deleteTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const tweet = await Tweet.findById(id);

        if (!tweet) {
            return res.status(404).json({
                success: false,
                message: 'Tweet not found',
            });
        }

        if (tweet.author.toString() !== req.user._id.toString()) {
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
        return res.status(500).json({
            success: false,
            message: 'Failed to delete tweet',
        });
    }
};

import Interaction, { InteractionType } from '../models/interaction.model';
import { Types } from 'mongoose';

export const likeTweet = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

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
        const userId = req.user._id;

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
        const { id } = req.params;
        const userId = req.user._id;

        // Check if original tweet exists
        const originalTweet = await Tweet.findById(id);
        if (!originalTweet) {
            return res.status(404).json({
                success: false,
                message: 'Tweet not found',
            });
        }

        const existingRetweet = await Interaction.findOne({
            user: userId,
            tweet: id,
            type: InteractionType.RETWEET,
        });

        if (existingRetweet) {
            return res.status(400).json({
                success: false,
                message: 'You already retweeted this tweet',
            });
        }

        // Create interaction
        await Interaction.create({
            user: userId,
            tweet: id,
            type: InteractionType.RETWEET,
        });

        // Create a new tweet as a retweet
        const newTweet = await Tweet.create({
            author: userId,
            retweetOf: id,
        });

        await Tweet.findByIdAndUpdate(id, { $inc: { retweetsCount: 1 } });

        // Create repost notification
        if (originalTweet.author.toString() !== userId.toString()) {
            await Notification.findOneAndUpdate(
                {
                    recipientId: originalTweet.author,
                    actorId: userId,
                    type: NotificationType.REPOST,
                    postId: id
                },
                {
                    recipientId: originalTweet.author,
                    actorId: userId,
                    type: NotificationType.REPOST,
                    postId: id,
                    isRead: false
                },
                { upsert: true, new: true }
            );
        }

        const populatedTweet = await newTweet.populate('author', 'name username image');
        await populatedTweet.populate('retweetOf');

        return res.status(201).json({
            success: true,
            message: 'Tweet retweeted',
            data: populatedTweet,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to retweet',
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

        const tweets = interactions.map(i => i.tweet);
        const enrichedTweets = await enrichTweets(tweets, req.user?._id?.toString() || null);
        return res.status(200).json({ success: true, data: enrichedTweets });
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
};
