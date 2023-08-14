const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
var jwtAuth = require('socketio-jwt-auth');
require('dotenv').config();

const registerMessageHandlers = require('./handlers/messageHandlers');
const registerUserHandlers = require('./handlers/userHandlers');
const registerConversationHandlers = require('./handlers/conversationHandlers');
const registerBoardHandlers = require('./handlers/boardHandlers');
const registerNotificationHandlers = require('./handlers/notificationHandlers');

const { bot } = require('./telegram');
const {
  createConversation,
  findOneConversation,
  updateConversation,
} = require('./db/services/conversationService');
const {
  addConversationToStage,
  findStageBy,
  changeStage,
} = require('./db/services/stageService');
const { UserModel } = require('./db/models/userModel');
const { TokenModel } = require('./db/models/tokenModel');
const { default: axios } = require('axios');
const log = console.log;
// const { EventEmitter } = require('events');
// const bus = new EventEmitter();

// bus.setMaxListeners(20);
const app = express();
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
    allowedHeaders: ['Access-Control-Allow-Origin'],
    credentials: true,
  })
);

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: '/socket',
  compress: true,
});

io.use(
  jwtAuth.authenticate(
    {
      secret: 'secret', // required, used to verify the token's signature
      algorithm: 'HS256', // optional, default to be HS256
      succeedWithoutToken: true,
    },
    async function (payload, done) {
      // log(payload);
      if (payload && payload?._doc?.email) {
        const user = await UserModel.findOne({ email: payload._doc.email });
        console.log(user, 'USER');
        if (!user) {
          return done(null, false, 'user does not exist');
        }
        return done(null, { user, logged_in: true });
      } else {
        return done(); // in your connection handler user.logged_in will be false
      }
    }
  )
);

mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((error) => console.log(error));

// createStage({ label: 'Идет сделка', value: 'deal', color: 'mediumslateblue' });

// данная функция выполняется при подключении каждого сокета (обычно, один клиент = один сокет)
const onConnection = (socket) => {
  socket.emit('checkAuth', socket.request.user);
  // получаем название комнаты из строки запроса "рукопожатия"
  const { roomId } = socket.handshake.auth;
  // console.log(token);
  // выводим сообщение о подключении пользователя
  log(`User: ${socket.id} join chat ${roomId}`);

  socket.roomId = roomId;

  function generateToken(payload) {
    const accessToken = jwt.sign(payload, 'secret', {
      expiresIn: '10d',
    });
    const refreshToken = jwt.sign(payload, 'secret', {
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async function saveToken(userId, refreshToken) {
    const tokenData = await TokenModel.findOne({ user: userId });
    if (tokenData) {
      tokenData.refreshToken = refreshToken;
      return tokenData.save();
    }
    const token = await TokenModel.create({ user: userId, refreshToken });
    return token;
  }

  socket.join(roomId);
  socket.on('login', async ({ username, password }) => {
    try {
      const user = await UserModel.findOne({ email: username });
      if (!user) throw new Error('Неверное имя пользователя или пароль');
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid)
        throw new Error('Неверное имя пользователя или пароль');
      const tokens = generateToken({ ...user });
      await saveToken(user._id, tokens.refreshToken);
      socket.emit('success', { ...tokens, user });
    } catch (error) {
      console.log(error);
      socket.emit('error', error.message);
    }
  });

  // регистрируем обработчики
  // обратите внимание на передаваемые аргументы
  registerMessageHandlers(io, socket);
  registerUserHandlers(io, socket);
  registerConversationHandlers(io, socket);
  registerBoardHandlers(io, socket);
  registerNotificationHandlers(io, socket);

  // обрабатываем отключение сокета-пользователя
  socket.on('disconnect', () => {
    // выводим сообщение
    log(`User: ${socket.id} leaved chat ${roomId}`);
    // покидаем комнату
    socket.leave(roomId);
  });
};

io.on('connection', onConnection);

bot.on('photo', async (msg) => {
  console.log(msg);
  const chatId = msg.chat.id;

  msg.type = 'photo';
  msg.text = msg.caption;
  await registerMessageHandlers.addMessage(msg, chatId);
  // await registerConversationHandlers.getConversations();
});

bot.on('document', async (msg) => {
  console.log(msg);
  const chatId = msg.chat.id;

  msg.unread = true;
  msg.type = 'document';
  msg.text = msg?.caption;
  await registerMessageHandlers.addMessage(msg, chatId);
  // await registerConversationHandlers.getConversations();
});

bot.on('my_chat_member', async (msg) => {
  if (msg.new_chat_member.user.is_bot) {
    const chatId = msg.chat.id;
    console.log(msg.new_chat_member);
    const status = msg.new_chat_member.status;
    if (status === 'administrator') {
      msg.type = 'event';
      msg.text = 'Права администратора установлены.';
      await bot.sendMessage(chatId, msg.text);
      await registerMessageHandlers.addMessage(msg, chatId);
    }
  }
});

bot.on('text', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const conversation = await findOneConversation({ chat_id: chatId });
    if (!conversation) {
      const stage = await findStageBy('raw');
      const data = await createConversation({
        title: msg.chat.title,
        chat_id: msg.chat.id,
        unreadCount: 0,
        type: msg.chat.type,
        stage: stage._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      stage.conversations.push(data._id);
      await stage.save();
    } else {
      await updateConversation(conversation._id, {
        title: msg.chat.title,
      });
    }

    // await registerConversationHandlers.getConversations();
  } catch (e) {
    console.log(e);
  }
  try {
    const chatId = msg.chat.id;
    msg.type = 'text';
    await registerMessageHandlers.addMessage(msg, chatId);
    await registerMessageHandlers.getMessages();
  } catch (e) {
    console.log(e);
  }
});

bot.on('migrate_to_chat_id', async (msg) => {
  const chatId = msg.chat.id; // ID чата, откуда пришло сообщение
  const conversation = await findOneConversation({ chat_id: chatId });
  if (!conversation) return;
  await updateConversation(conversation._id, {
    chat_id: msg.migrate_to_chat_id,
    type: 'supergroup',
  });
  // conversations[conversationIndex].chat_id = msg.migrate_to_chat_id;
  // conversations[conversationIndex].type = 'supergroup';
  msg.type = 'event';
  msg.text = `Чат "${msg.chat.title}" стал супергруппой`;
  msg.unread = false;
  await registerMessageHandlers.addMessage(msg, msg.migrate_to_chat_id);
  // await registerConversationHandlers.getConversations();
  // return await registerBoardHandlers.getStatuses();
});

const token = process.env.API_TOKEN;
const officeToken = process.env.OFFICE_TOKEN;
const officeApi = axios.create({
  baseURL: 'http://app.moneyport.ru/office',
  headers: { 'x-api-key': `${token}` },
});

async function getOrder(chat_id) {
  try {
    const response = await officeApi.get(
      `/order?chat_id=${chat_id}&api_key=${officeToken}`
    );
    return response.data;
  } catch (error) {
    return;
  }
}

bot.on('left_chat_member', async (msg) => {
  console.log(msg);
  if (msg.left_chat_member == 6174655831) return;
  const chatId = msg.chat.id;
  let conversation = await findOneConversation({ chat_id: chatId });
  msg.type = 'event';
  msg.text = `Пользователь ${
    msg.left_chat_member?.last_name
      ? msg.left_chat_member.first_name + ' ' + msg.left_chat_member?.last_name
      : msg.left_chat_member.first_name
  } вышел из чата.`;
  conversation.members = conversation.members.filter(
    (member) => member.id !== msg.left_chat_member.id
  );
  await conversation.save();
  await registerMessageHandlers.addMessage(msg, chatId);
  // await registerConversationHandlers.getConversations();
  // return await registerBoardHandlers.getStatuses();
});

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;
  const me = await bot.getMe();
  if (msg.new_chat_member == 6174655831) return;
  if (me.id != msg.new_chat_member.id) {
    let conversation = await findOneConversation({ chat_id: chatId });
    if (!conversation) {
      const stage = await findStageBy('raw');
      const data = await createConversation({
        title: msg.chat.title,
        chat_id: msg.chat.id,
        unreadCount: 0,
        type: msg.chat.type,
        stage: stage._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      stage.conversations.push(data._id);
      await stage.save();
      conversation = data;
    } else {
      if (!conversation?.members?.length) {
        await updateConversation(conversation._id, {
          title: msg.chat.title,
          workAt: Date.now(),
        });
        const { oldTmp, newTmp } = await changeStage(
          conversation._id,
          'raw',
          -1
        );
        io.emit('statuses:load', { oldTmp, newTmp });
      }
    }
    if (!conversation?.link) {
      try {
        const link = await bot.exportChatInviteLink(chatId);
        await updateConversation(conversation._id, {
          link,
        });
      } catch (e) {
        console.log(e);
      }
    }
    const order = await getOrder(chatId);
    msg.type = 'event';
    msg.members = [];
    msg.members.push(msg.new_chat_member);
    msg.text = `Пользователь ${
      msg.new_chat_member?.last_name
        ? msg.new_chat_member.first_name + ' ' + msg.new_chat_member?.last_name
        : msg.new_chat_member.first_name
    } вошел в чат. ${
      !conversation?.members?.length && order && order['how_to_send']
        ? `\n1. Хотите совершить перевод: ${order['how_to_send']} \n2. Валюта получения: ${order['symbol']}\n3. Сумма к получению: ${order['summ']}`
        : ''
    }`;
    conversation.members.push(msg.new_chat_member);
    await conversation.save();
    await registerMessageHandlers.addMessage(msg, chatId);
    // await registerConversationHandlers.getConversations();
    // return await registerBoardHandlers.getStatuses();
  }
  const conversation = await findOneConversation({ chat_id: chatId });
  if (!conversation) {
    const stage = await findStageBy('ready');
    const data = await createConversation({
      title: msg.chat.title,
      chat_id: msg.chat.id,
      unreadCount: 0,
      type: msg.chat.type,
      stage: stage._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    stage.conversations.push(data._id);
    await stage.save();
    // await registerConversationHandlers.getConversations();
    // await registerBoardHandlers.getStatuses();
  }
});

bot.on('new_chat_title', async (msg) => {
  const chatId = msg.chat.id;
  const conversation = await findOneConversation({ chat_id: chatId });
  if (!conversation) return;
  await updateConversation(conversation._id, {
    title: msg.new_chat_title,
  });
  msg.type = 'event';
  msg.text = `Название чата сменилось на "${msg.new_chat_title}"`;
  msg.unread = false;

  // console.log(conversation);
  await registerMessageHandlers.addMessage(msg, chatId);
  // await registerConversationHandlers.getConversations();
  // await registerBoardHandlers.getStatuses();
});

bot.on('group_chat_created', async (msg) => {
  const chatId = msg.chat.id;
  const stage = await findStageBy('ready');
  const data = await createConversation({
    title: msg.chat.title,
    chat_id: msg.chat.id,
    unreadCount: 0,
    type: msg.chat.type,
    stage: stage._id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  stage.conversations.push(data._id);
  await stage.save();
  msg.type = 'event';
  msg.text = `Чат "${msg.chat.title}" создан`;
  msg.unread = false;

  await registerMessageHandlers.addMessage(msg, chatId);
  // await registerConversationHandlers.getConversations();
  // await registerBoardHandlers.getStatuses();
});

httpServer.listen(5005, () => {
  log(`Server ready. Port: 5005`);
});
