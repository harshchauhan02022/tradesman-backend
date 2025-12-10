// controllers/chatController.js
const Message = require('../models/messageModel');
const User = require('../models/User');
const { Op } = require('sequelize');

// ============================================
// POST /api/chat/send
// ============================================
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, message } = req.body;

    if (!senderId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!receiverId || !message)
      return res.status(400).json({
        success: false,
        message: 'receiverId and message required'
      });

    const newMsg = await Message.create({
      senderId,
      receiverId,
      message,
      isRead: false
    });

    return res.status(201).json({
      success: true,
      message: 'Message sent',
      data: newMsg
    });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET /api/chat/conversation/:userId
// ============================================
exports.getConversation = async (req, res) => {
  try {
    const loggedUser = parseInt(req.user.id, 10);
    const otherUserId = parseInt(req.params.userId, 10);

    if (!loggedUser) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // fetch messages and include sender info (if you have associations)
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: loggedUser, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: loggedUser }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    // load user info in bulk (avoid N queries)
    const userIds = Array.from(new Set(messages.flatMap(m => [m.senderId, m.receiverId])));
    const users = await User.findAll({
      where: { id: userIds },
      attributes: ['id', 'name', 'role', 'profileImage']
    });
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    // transform messages to include helpful fields
    const out = messages.map(m => ({
      id: m.id,
      senderId: m.senderId,
      receiverId: m.receiverId,
      message: m.message,
      isRead: m.isRead,
      createdAt: m.createdAt,
      // convenience fields for frontend:
      isMine: m.senderId === loggedUser,           // true if message sent by logged user
      sender: userMap[m.senderId] || null,         // { id, name, role, profileImage }
      receiver: userMap[m.receiverId] || null
    }));

    return res.status(200).json({ success: true, messages: out });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET /api/chat/list   (WhatsApp style chat list)
// ============================================
exports.getChatList = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    // find all messages for this user
    const msgs = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    const convMap = new Map();

    for (const msg of msgs) {
      const otherId = msg.senderId === userId ? msg.receiverId : msg.senderId;

      if (!convMap.has(otherId)) convMap.set(otherId, []);

      convMap.get(otherId).push(msg);
    }

    let chatList = [];

    for (const [otherId, messages] of convMap.entries()) {
      const otherUser = await User.findByPk(otherId, {
        attributes: ['id', 'name', 'email', 'role', 'profileImage']
      });

      const lastMessage = messages[messages.length - 1];

      chatList.push({
        withUser: otherUser || { id: otherId },
        lastMessage,
        messages
      });
    }

    // Sort latest message first (DESC)
    chatList.sort((a, b) =>
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    return res.status(200).json({
      success: true,
      data: chatList
    });

  } catch (err) {
    console.error('getChatList error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// PUT /api/chat/mark-read
// ============================================
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationWith } = req.body;

    if (!userId)
      return res.status(401).json({ success: false, message: 'Unauthorized' });

    if (!conversationWith)
      return res.status(400).json({
        success: false,
        message: 'conversationWith is required'
      });

    const [updatedCount] = await Message.update(
      { isRead: true },
      {
        where: {
          senderId: conversationWith,
          receiverId: userId,
          isRead: false
        }
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Messages marked as read',
      updated: updatedCount
    });

  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
