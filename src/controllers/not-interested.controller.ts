import { Request, Response } from 'express';
import User from '../models/user.model';
import Tweet from '../models/tweet.model';
import mongoose from 'mongoose';

export const toggleNotInterested = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { tweetId } = req.params;
        const currentUserId = req.user._id;

        const user = await User.findById(currentUserId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const targetTweetId = new mongoose.Types.ObjectId(tweetId as string);
        const tweet = await Tweet.findById(targetTweetId);
        if (!tweet) return res.status(404).json({ success: false, message: 'Tweet not found' });

        // Ensure privacy and notInterestedTweets array exists
        if (!user.privacy) {
            user.privacy = {
                profileVisibility: 'public',
                messagePermission: 'everyone',
                mutedWords: [],
                blockedUsers: [],
                notInterestedTweets: []
            };
        }
        if (!(user.privacy as any).notInterestedTweets) {
            (user.privacy as any).notInterestedTweets = [];
        }

        const notInterestedList = (user.privacy as any).notInterestedTweets as mongoose.Types.ObjectId[];
        const isNotInterested = notInterestedList.some(id => id.toString() === tweetId);

        if (isNotInterested) {
            // Remove from not interested (optional toggle behavior)
            (user.privacy as any).notInterestedTweets = notInterestedList.filter(id => id.toString() !== tweetId);
            await user.save();
            return res.status(200).json({ success: true, message: 'Removed from not interested' });
        } else {
            // Add to not interested
            notInterestedList.push(targetTweetId);
            await user.save();
            return res.status(200).json({ success: true, message: 'Marked as not interested' });
        }
    } catch (error) {
        console.error('Toggle Not Interested Error:', error);
        return res.status(500).json({ success: false, message: 'Toggle not interested failed' });
    }
};
