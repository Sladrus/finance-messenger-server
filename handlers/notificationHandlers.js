module.exports = (io, socket) => {
  const pushNotification = async (message) => {
    io.emit('notification', message);
  };

  module.exports.pushNotification = pushNotification;
};
