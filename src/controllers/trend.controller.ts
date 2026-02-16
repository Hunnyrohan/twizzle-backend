import { Request, Response } from 'express';

export const getTrends = async (req: Request, res: Response) => {
    // Mock trends for now, could be aggregated from hashtags in tweets later
    const trends = [
        { id: '1', name: '#TwizzleLaunch', posts: '1.2M' },
        { id: '2', name: 'TypeScript', posts: '500K' },
        { id: '3', name: '#ReactJS', posts: '320K' },
        { id: '4', name: 'AI Revolution', posts: '150K' },
        { id: '5', name: 'Web Development', posts: '100K' },
    ];

    return res.status(200).json({
        success: true,
        data: trends,
    });
};
