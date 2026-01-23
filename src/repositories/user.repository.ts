import User from '../models/user.model';

class UserRepository {
  async create(userData: any) {
    return await User.create(userData);
  }

  async findByEmail(email: string) {
    return await User.findOne({ email });
  }

  // ✅ Find by email OR username
  async findByIdentifier(identifier: string) {
    return await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
      ],
    });
  }

  async findById(id: string) {
    return await User.findById(id).select('-password');
  }

  async exists(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    return !!user;
  }
}

export default new UserRepository();
