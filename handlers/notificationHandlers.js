module.exports = (io, socket) => {
  const pushNotification = async (message) => {
    socket.emit('notification', message);
  };

  module.exports.pushNotification = pushNotification;
};
