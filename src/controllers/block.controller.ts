import { Request, Response } from 'express';
import User from '../models/user.model';
import mongoose from 'mongoose';

export const getBlocks = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const user = await User.findById(req.user._id).populate('privacy.blockedUsers', 'name username image bio');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        return res.status(200).json({
            success: true,
            data: user.privacy.blockedUsers || []
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch blocks' });
    }
};

export const toggleBlock = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const { userId } = req.params;
        const currentUserId = req.user._id;

        if (userId === currentUserId.toString()) {
            return res.status(400).json({ success: false, message: 'Cannot block yourself' });
        }

        const user = await User.findById(currentUserId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const targetId = new mongoose.Types.ObjectId(userId);

        // Check if already blocked
        const isBlocked = user.privacy.blockedUsers.some(id => id.toString() === userId);

        if (isBlocked) {
            // Unblock
            user.privacy.blockedUsers = user.privacy.blockedUsers.filter(id => id.toString() !== userId);
            await user.save();
            return res.status(200).json({ success: true, message: 'User unblocked' });
        } else {
            // Block
            user.privacy.blockedUsers.push(targetId as any);
            await user.save();
            return res.status(200).json({ success: true, message: 'User blocked' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Toggle block failed' });
    }
};
