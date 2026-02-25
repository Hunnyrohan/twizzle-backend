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

    const tweetIds = tweets.map(t => t._id);

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
        const tweetObj = t.toObject ? t.toObject() : t;
        const id = tweetObj._id.toString();
        const userInteractions = interactionMap[id] || {};

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
