// @ts-nocheck
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/user.model';
import Tweet from '../models/tweet.model';
import Follow from '../models/follow.model';
import Interaction, { InteractionType } from '../models/interaction.model';

dotenv.config();

const runVerification = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Cleanup
        await User.deleteMany({});
        await Tweet.deleteMany({});
        await Follow.deleteMany({});
        await Interaction.deleteMany({});
        console.log('Cleaned up DB');

        // 2. Create Users
        const alice = await User.create({
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
            password: 'password123',
        });
        console.log('Created Alice:', alice.username);

        const bob = await User.create({
            name: 'Bob',
            username: 'bob',
            email: 'bob@example.com',
            password: 'password123',
        });
        console.log('Created Bob:', bob.username);

        // 3. Alice Tweets
        const tweet1 = await Tweet.create({
            content: 'Hello World from Alice!',
            author: alice._id,
        });
        console.log('Alice tweeted:', tweet1.content);

        // 4. Bob Follows Alice
        await Follow.create({
            follower: bob._id,
            following: alice._id,
        });
        await User.findByIdAndUpdate(bob._id, { $inc: { followingCount: 1 } });
        await User.findByIdAndUpdate(alice._id, { $inc: { followersCount: 1 } });
        console.log('Bob followed Alice');

        // 5. Bob fetches feed
        // Simulate feed logic from controller
        const following = await Follow.find({ follower: bob._id }).select('following');
        const followingIds = following.map(f => f.following);
        followingIds.push(bob._id);

        const feed = await Tweet.find({
            author: { $in: followingIds },
            parentTweet: null,
        }).populate('author', 'username');

        console.log('Bob\'s Feed:', feed.map(t => `${t.author.username}: ${t.content}`));
        if (feed.length === 1 && feed[0].content === 'Hello World from Alice!') {
            console.log('✅ Feed Verified');
        } else {
            console.error('❌ Feed Failed');
        }

        // 6. Bob Likes Tweet
        await Interaction.create({
            user: bob._id,
            tweet: tweet1._id,
            type: InteractionType.LIKE,
        });
        await Tweet.findByIdAndUpdate(tweet1._id, { $inc: { likesCount: 1 } });
        console.log('Bob liked tweet');

        const updatedTweet = await Tweet.findById(tweet1._id);
        if (updatedTweet?.likesCount === 1) {
            console.log('✅ Like Verified');
        } else {
            console.error('❌ Like Failed');
        }

        // 7. Search
        const searchResults = await User.find({
            username: { $regex: 'ali', $options: 'i' }
        });
        console.log('Search Results for "ali":', searchResults.map(u => u.username));
        if (searchResults.length > 0 && searchResults[0].username === 'alice') {
            console.log('✅ Search Verified');
        } else {
            console.error('❌ Search Failed');
        }

    } catch (error) {
        console.error('Verification Error:', error);
    } finally {
        await mongoose.connection.close();
    }
};

runVerification();
