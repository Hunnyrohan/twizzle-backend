// backend/src/scripts/seed-notifications.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification, { NotificationType } from '../models/notification.model';
import User from '../models/user.model';
import Tweet from '../models/tweet.model';

dotenv.config();

const seedNotifications = async () => {
    try {
        // Connect to database
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log('Connected to MongoDB');

        // Get existing users
        const users = await User.find().limit(5);
        if (users.length < 2) {
            console.log('Not enough users. Please create users first.');
            process.exit(1);
        }

        // Get existing tweets
        const tweets = await Tweet.find().limit(10);

        // Clear existing notifications
        await Notification.deleteMany({});
        console.log('Cleared existing notifications');

        const notifications = [];
        const recipient = users[0]; // First user will receive notifications

        // Create various notification types
        for (let i = 1; i < users.length; i++) {
            const actor = users[i];

            // Follow notification
            notifications.push({
                recipientId: recipient._id,
                actorId: actor._id,
                type: NotificationType.FOLLOW,
                isRead: i % 3 === 0, // Some read, some unread
                createdAt: new Date(Date.now() - i * 3600000), // Stagger times
            });

            // Like notification (if tweets exist)
            if (tweets.length > 0) {
                notifications.push({
                    recipientId: recipient._id,
                    actorId: actor._id,
                    type: NotificationType.LIKE,
                    postId: tweets[i % tweets.length]._id,
                    isRead: i % 4 === 0,
                    createdAt: new Date(Date.now() - (i + 1) * 3600000),
                });
            }

            // Mention notification (if tweets exist)
            if (tweets.length > 1) {
                notifications.push({
                    recipientId: recipient._id,
                    actorId: actor._id,
                    type: NotificationType.MENTION,
                    postId: tweets[(i + 1) % tweets.length]._id,
                    isRead: i % 5 === 0,
                    createdAt: new Date(Date.now() - (i + 2) * 3600000),
                });
            }

            // Comment notification (if tweets exist)
            if (tweets.length > 2) {
                notifications.push({
                    recipientId: recipient._id,
                    actorId: actor._id,
                    type: NotificationType.COMMENT,
                    postId: tweets[(i + 2) % tweets.length]._id,
                    commentText: `Great post! This is comment ${i}`,
                    isRead: i % 2 === 0,
                    createdAt: new Date(Date.now() - (i + 3) * 3600000),
                });
            }
        }

        // Insert notifications
        await Notification.insertMany(notifications);
        console.log(`✅ Created ${notifications.length} notifications for user: ${recipient.username}`);

        // Show summary
        const unreadCount = await Notification.countDocuments({
            recipientId: recipient._id,
            isRead: false,
        });
        console.log(`📬 Unread notifications: ${unreadCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedNotifications();
