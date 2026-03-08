import { Request, Response } from 'express';
import User from '../models/user.model';

export const getPrivacy = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        // @ts-ignore
        const user = await User.findById(req.user._id).select('privacy');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.status(200).json({
            success: true,
            data: user.privacy
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch privacy settings' });
    }
};

export const updatePrivacy = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { profileVisibility, messagePermission, mutedWords } = req.body;
        // @ts-ignore
        const userId = req.user._id;

        // Validation based on User model enums
        if (profileVisibility && !['public', 'private'].includes(profileVisibility)) {
            return res.status(400).json({ success: false, message: 'Invalid profile visibility' });
        }
        if (messagePermission && !['everyone', 'following', 'nobody'].includes(messagePermission)) {
            return res.status(400).json({ success: false, message: 'Invalid message permission' });
        }

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (profileVisibility) user.privacy.profileVisibility = profileVisibility;
        if (messagePermission) user.privacy.messagePermission = messagePermission;
        if (mutedWords) user.privacy.mutedWords = mutedWords;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Privacy settings updated',
            data: user.privacy
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update privacy settings' });
    }
};
