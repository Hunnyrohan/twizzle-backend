import Interaction, { InteractionType } from '../models/interaction.model';
import { Types } from 'mongoose';

/**
 * Enriches a list of tweets with user-specific interaction flags: isLiked, isRetweeted, isBookmarked.
 * @param tweets List of tweet documents (Mongoose or plain objects)
 * @param userId ID of the current logged-in user
 */
export const enrichTweets = async (tweets: any[], userId: string | null) => {
    if (!tweets.length) return [];

    if (!userId) {
        return tweets.map(t => {
            const tweetObj = t.toObject ? t.toObject() : t;
            return {
                ...tweetObj,
                isLiked: false,
                isRetweeted: false,
                isBookmarked: false
            };
        });
    }

    const tweetIds = tweets.map(t => t.retweetOf || t._id);

    const interactions = await Interaction.find({
        user: new Types.ObjectId(userId),
        tweet: { $in: tweetIds }
    });

    const interactionMap = interactions.reduce((acc: any, curr) => {
        const id = curr.tweet.toString();
        if (!acc[id]) acc[id] = {};
        acc[id][curr.type] = true;
        return acc;
    }, {});

    return tweets.map(t => {
        if (!t) return null;
        const tweetObj = t.toObject ? t.toObject() : t;
        const id = tweetObj._id.toString();
        const canonicalId = (tweetObj.retweetOf || id).toString();
        const userInteractions = interactionMap[canonicalId] || {};

        // Sanitize author image path if it exists
        if (tweetObj.author && typeof tweetObj.author === 'object') {
            const author = tweetObj.author;
            if (author.image && typeof author.image === 'string' && !author.image.startsWith('http')) {
                const normalized = author.image.replace(/\\/g, '/');
                if (!normalized.startsWith('uploads/')) {
                    const index = normalized.indexOf('uploads/');
                    author.image = index !== -1 ? normalized.substring(index) : normalized;
                } else {
                    author.image = normalized;
                }
            }
            author.id = (author._id || author.id)?.toString();
            author.avatarUrl = author.image;
        }

        return {
            ...tweetObj,
            _id: id,
            id: id,
            isLiked: !!userInteractions[InteractionType.LIKE],
            isRetweeted: !!userInteractions[InteractionType.RETWEET],
            isBookmarked: !!userInteractions[InteractionType.BOOKMARK]
        };
    });
};
