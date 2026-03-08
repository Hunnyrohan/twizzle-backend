import { Request, Response } from 'express';
import User from '../models/user.model';
import Tweet from '../models/tweet.model';

class AdminController {
  async getStats(_: Request, res: Response) {
    const usersCount = await User.countDocuments();
    const tweetsCount = await Tweet.countDocuments();
    res.json({
      success: true,
      data: {
        usersCount,
        tweetsCount,
      }
    });
  }

  async createUser(req: Request, res: Response) {
    const { name, email, password, role } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      role,
      image: req.file?.filename,
    });

    res.status(201).json({ success: true, data: user });
  }

  async getUsers(_: Request, res: Response) {
    const users = await User.find();
    res.json({ success: true, data: { users } });
  }

  async getUser(req: Request, res: Response) {
    const user = await User.findById(req.params.id);
    res.json({ success: true, data: user });
  }

  async updateUser(req: Request, res: Response) {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { ...req.body, image: req.file?.filename },
      { new: true }
    );
    res.json({ success: true, data: updated });
  }

  async deleteUser(req: Request, res: Response) {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  }
}

export default new AdminController();
