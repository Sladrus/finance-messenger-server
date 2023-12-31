const {
  findAllConversations,
  updateConversation,
  readConversation,
  findMessagesByChat,
  linkConversation,
  findOneConversation,
  changeuserConversation,
  createTasks,
  findAllTasks,
  findAllTags,
  createTag,
  addTag,
  removeTag,
} = require('../db/services/conversationService');
const { createMessage } = require('../db/services/messageService');
const { findStages } = require('../db/services/stageService');
// const { addMessage } = require('./messageHandlers');
const { bot } = require('../telegram');
const moment = require('moment-timezone');

const getStatuses = async (io, socket) => {
  console.log('STAGES');
  const stages = await findStages();
  io.emit('statuses', stages);
};

const getMessages = async (io, socket) => {
  console.log('MESSAGES');
  console.log(socket.roomId, 'TYT');
  if (Number(socket.roomId) === 0) return;
  try {
    const messages = await findMessagesByChat({
      chat_id: Number(socket.roomId),
    });
    io.in(socket.roomId).emit('messages', messages);
  } catch (e) {
    console.log(e);
  }
};

const addMessage = async (message, chatId) => {
  console.log(message);
  const createdMessage = await createMessage(chatId, message);
};

module.exports = (io, socket) => {
  const getConversations = async ({ page, searchInput, filter, dateRange }) => {
    console.log('CONVERSATIONS');
    const conversations = await findAllConversations(
      page,
      50,
      searchInput,
      filter,
      dateRange
    );
    socket.emit('conversations', conversations);
  };

  const getConversation = async ({ chat_id }) => {
    console.log('CONVERSATION', chat_id);
    // if (chat_id === 0) return;
    const conversationTmp = await findOneConversation({ chat_id });
    // console.log(conversation);
    socket.emit('conversation', { conversationTmp });
  };

  const getTasks = async () => {
    console.log('TASKS');
    const tasks = await findAllTasks();
    socket.emit('tasks', tasks);
  };

  const getTags = async () => {
    console.log('TAGS');
    const tags = await findAllTags();
    socket.emit('tags', tags);
  };

  const refreshLink = async ({ chat_id }) => {
    try {
      const link = await bot.exportChatInviteLink(chat_id);
      const conversation = await findOneConversation({ chat_id: chat_id });
      await updateConversation(conversation._id, {
        link,
      });
      const conversationTmp = await findOneConversation({ chat_id: chat_id });
      io.emit('status:conversation', conversationTmp);
      socket.emit('conversation', { conversationTmp });
    } catch (e) {
      console.log(e);
    }
  };

  const readConversations = async ({ chat_id }) => {
    const conversationTmp = await readConversation(chat_id);

    io.emit('status:conversation', conversationTmp);
    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    socket.emit('conversation', { conversationTmp });
  };

  const createTask = async ({ task, chat_id, user }) => {
    console.log(task, chat_id);
    const result = await createTasks(task, chat_id);
    console.log(result);
    const date = moment(task.endAt).tz('Europe/Moscow');
    const convertedDate = date.format('DD.MM.YY HH:mm');

    // const convertedDate = moment(task.endAt).format('DD.MM.YY, hh:mm');

    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user.username,
        },
        text: `Добавлена новая задача: "${task.text}" на ${convertedDate}`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );
    const conversationTmp = await findOneConversation({ chat_id: chat_id });
    io.emit('status:conversation', conversationTmp);
    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    await getTasks();
    socket.emit('conversation', { conversationTmp });
  };

  const createTags = async ({ value, chat_id, user }) => {
    const result = await createTag(value, chat_id);
    await addTag(value, chat_id);
    console.log(result);
    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user.username,
        },
        text: `Создан и добавлен тэг: "${result.value}"`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );
    const conversationTmp = await findOneConversation({ chat_id: chat_id });
    io.emit('status:conversation', conversationTmp);
    socket.emit('conversation', { conversationTmp });

    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    await getTags();
  };

  const addTags = async ({ value, chat_id, user }) => {
    const result = await addTag(value.label, chat_id);
    console.log(result);
    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user.username,
        },
        text: `Добавлен тэг: "${result.value}"`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );
    const conversationTmp = await findOneConversation({ chat_id: chat_id });
    io.emit('status:conversation', conversationTmp);
    socket.emit('conversation', { conversationTmp });

    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    await getTags();
  };

  const removeTags = async ({ value, chat_id, user }) => {
    console.log(value);
    const result = await removeTag(value.label, chat_id);
    console.log(result);
    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user.username,
        },
        text: `Удален тэг: "${result.value}"`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );
    const conversationTmp = await findOneConversation({ chat_id: chat_id });
    io.emit('status:conversation', conversationTmp);
    socket.emit('conversation', { conversationTmp });

    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
    await getTags();
  };

  const changeuserConversations = async ({ chat_id, user }) => {
    console.log(chat_id, user);
    const conversation = await changeuserConversation(chat_id, user);
    await addMessage(
      {
        type: 'event',
        from: {
          id: 1274681231,
          first_name: user ? user.username : conversation.user.username,
        },
        text: `${user ? user?.username : conversation.user?.username} ${
          user ? 'привязал' : 'отвязал'
        } чат`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );

    const conversationTmp = await findOneConversation({ chat_id: chat_id });

    io.emit('status:conversation', conversationTmp);
    socket.emit('conversation', { conversationTmp });

    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
  };

  const linkConversations = async ({ chat_id, user }) => {
    // console.log(chat_id, user);
    const conversation = await linkConversation(chat_id, user);
    await addMessage(
      {
        type: 'event',
        from: { id: 1274681231, first_name: user.username },
        text: `${user.username} ${
          conversation?.user ? 'отвязал' : 'привязал'
        } чат`,
        unread: false,
        date: Date.now() / 1000,
      },
      chat_id
    );

    const conversationTmp = await findOneConversation({ chat_id: chat_id });

    io.emit('status:conversation', conversationTmp);
    socket.emit('conversation', { conversationTmp });

    const messages = await findMessagesByChat({
      chat_id: chat_id,
    });
    io.in(chat_id).emit('messages', messages);
  };

  // регистрируем обработчики
  socket.on('task:get', getTasks);

  socket.on('tags:get', getTags);
  socket.on('tags:create', createTags);
  socket.on('tags:add', addTags);
  socket.on('tags:remove', removeTags);

  socket.on('conversation:get', getConversations);
  socket.on('conversation:getOne', getConversation);

  socket.on('conversation:refresh', refreshLink);
  socket.on('conversation:read', readConversations);
  socket.on('conversation:link', linkConversations);
  socket.on('conversation:changeuser', changeuserConversations);
  socket.on('conversation:taskCreate', createTask);

  //   socket.on('message:remove', removeMessage);
  // module.exports.addConversation = addConversation;
  module.exports.getConversations = getConversations;
  module.exports.linkConversations = linkConversations;
  module.exports.readConversations = readConversations;
};
