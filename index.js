const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
var jwtAuth = require('socketio-jwt-auth');

const registerMessageHandlers = require('./handlers/messageHandlers');
const registerUserHandlers = require('./handlers/userHandlers');
const registerConversationHandlers = require('./handlers/conversationHandlers');
const registerBoardHandlers = require('./handlers/boardHandlers');
const registerNotificationHandlers = require('./handlers/notificationHandlers');

const { bot } = require('./telegram');
const conversations = require('./db/conversations');
const {
  createConversation,
  findOneConversation,
} = require('./db/services/conversationService');
const {
  addConversationToStage,
  findStageBy,
} = require('./db/services/stageService');
const { UserModel } = require('./db/models/userModel');
const { TokenModel } = require('./db/models/tokenModel');
const log = console.log;

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

const io = new Server(httpServer, { cors: { origin: '*' } });

io.use(
  jwtAuth.authenticate(
    {
      secret: 'secret', // required, used to verify the token's signature
      algorithm: 'HS256', // optional, default to be HS256
      succeedWithoutToken: true,
    },
    async function (payload, done) {
      log(payload);

      if (payload && payload?._doc?.email) {
        const user = await UserModel.findOne({ email: payload._doc.email });
        console.log(user);
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
  .connect(
    'mongodb+srv://root:root@cluster0.kc0ptcm.mongodb.net/?retryWrites=true&w=majority',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .catch((error) => console.log(error));

// createStage({ label: 'Идет сделка', value: 'deal', color: 'mediumslateblue' });

// данная функция выполняется при подключении каждого сокета (обычно, один клиент = один сокет)
const onConnection = (socket) => {
  console.log(socket.request.user);
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
      if (!user) throw new Error('Неверное имя пользователя');
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid)
        throw new Error('Неверное имя пользователя или пароль');
      const tokens = generateToken({ ...user });
      await saveToken(user._id, tokens.refreshToken);
      socket.emit('success', { ...tokens, user });
    } catch (error) {
      socket.emit('error', error.message);
    }
  });

  // регистрируем обработчики
  // обратите внимание на передаваемые аргументы
  registerMessageHandlers(io, socket);
  // registerUserHandlers(io, socket);
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
  await registerConversationHandlers.getConversations();
});

bot.on('text', async (msg) => {
  const chatId = msg.chat.id;
  msg.type = 'text';
  const conversation = await findOneConversation({ chat_id: chatId });
  if (!conversation) {
    const stage = await findStageBy('free');
    const data = await createConversation({
      title: msg.chat.title,
      chat_id: msg.chat.id,
      unreadCount: 0,
      stage: stage._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log(stage);
    stage.conversations.push(data._id);
    await stage.save();
    // await addConversationToStage(data._id, 'ready');
    await registerBoardHandlers.getStatuses();
  }

  // console.log(conversation);
  await registerMessageHandlers.addMessage(msg, chatId);
  await registerConversationHandlers.getConversations();
});

bot.on('migrate_to_chat_id', async (msg) => {
  const chatId = msg.chat.id; // ID чата, откуда пришло сообщение
  const conversationIndex = conversations.findIndex(
    (o) => o.chat_id === chatId
  );
  if (conversationIndex == -1) return;
  console.log(conversations[conversationIndex]);
  conversations[conversationIndex].chat_id = msg.migrate_to_chat_id;
  conversations[conversationIndex].type = 'supergroup';
  await registerConversationHandlers.getConversations();
});

bot.on('new_chat_members', async (msg) => {
  const chatId = msg.chat.id;
  const me = await bot.getMe();
  if (me.id != msg.new_chat_member.id) return;
  const chat = msg.chat;
  chat.messages = [];
  chat.status = 'free';
  await registerConversationHandlers.addConversation(chat, chatId);
});

httpServer.listen(5005, () => {
  log(`Server ready. Port: 5005`);
});
