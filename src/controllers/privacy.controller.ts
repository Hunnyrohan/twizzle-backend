import { Request, Response } from 'express';
import User from '../models/user.model';

export const updatePrivacy = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { profileVisibility, messagePermission, mutedWords } = req.body;
        const userId = req.user._id;

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
