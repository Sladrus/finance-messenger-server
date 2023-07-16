const { UserModel } = require('../models/userModel');

class UserService {
  async findAllUsers() {
    const users = await UserModel.find({}, { password: 0 });
    return users;
  }
}

module.exports = new UserService();
