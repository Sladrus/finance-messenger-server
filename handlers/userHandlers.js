// нормализованная структура

const { findAllUsers } = require('../db/services/userService');

// имитация БД
const users = {
  1: { username: 'Alice', online: false },
  2: { username: 'Bob', online: false },
};

module.exports = (io, socket) => {
  const getUsers = async () => {
    const users = await findAllUsers();
    socket.emit('users', users);
  };

  socket.on('user:get', getUsers);
};
