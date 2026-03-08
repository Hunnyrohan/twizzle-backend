import { Request, Response } from 'express';
import User from '../models/user.model';

export const getSettings = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User.findById(req.user._id).select('privacy notifications theme isVerified image name username');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        return res.status(200).json({
            success: true,
            data: {
                privacy: user.privacy,
                notifications: user.notifications,
                theme: user.theme,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    image: user.image,
                    isVerified: user.isVerified
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch settings' });
    }
};

export const updateSettings = async (req: Request, res: Response) => {
    try {
        const { privacy, notifications, theme } = req.body;

        // Use $set to update nested fields without overwriting the whole object if partial provided
        // But for simplicity in this MVP, we might expect full objects or merge them.
        // Let's use simple merge logic using object spread if needed, or rely on mongoose.

        const updateData: any = {};
        if (theme) updateData.theme = theme;
        if (privacy) updateData.privacy = privacy; // Warning: this replaces the whole object if not careful.
        if (notifications) updateData.notifications = notifications;

        // Better approach for partial updates:
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (theme) user.theme = theme;
        if (privacy) {
            user.privacy = { ...user.privacy, ...privacy };
        }
        if (notifications) {
            user.notifications = { ...user.notifications, ...notifications };
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Settings updated',
            data: {
                privacy: user.privacy,
                notifications: user.notifications,
                theme: user.theme,
                user: {
                    id: user._id,
                    name: user.name,
                    username: user.username,
                    image: user.image,
                    isVerified: user.isVerified
                }
            }
        });

    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update settings' });
    }
};
