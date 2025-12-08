// controllers/chatController.js
const Message = require('../models/messageModel');
const User = require('../models/User');
const { Op } = require('sequelize');

// POST /api/chat/send
exports.sendMessage = async (req, res) => {
  try {
    const senderId = req.user?.id;
    const { receiverId, message } = req.body;

    if (!senderId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!receiverId || !message) {
      return res.status(400).json({ success: false, message: 'receiverId and message required' });
    }

    const newMsg = await Message.create({ senderId, receiverId, message });

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

// GET /api/chat/conversation/:userId
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user?.id;
    const otherId = parseInt(req.params.userId, 10);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!otherId || Number.isNaN(otherId)) {
      return res.status(400).json({ success: false, message: 'other userId required' });
    }

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId, receiverId: otherId },
          { senderId: otherId, receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    return res.status(200).json({ success: true, data: messages });
  } catch (err) {
    console.error('getConversation error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/chat/list  -> last message with each user
// GET /api/chat/list  -> conversations list (WhatsApp style)
exports.getChatList = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // sabhi messages jaha ye user sender ya receiver hai
    const msgs = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      order: [['createdAt', 'ASC']]   // ✅ oldest → newest
    });

    // Map: otherUserId -> [messages...]
    const convMap = new Map();

    for (const m of msgs) {
      const otherId = (m.senderId === userId) ? m.receiverId : m.senderId;

      if (!convMap.has(otherId)) {
        convMap.set(otherId, []);
      }
      convMap.get(otherId).push(m);   // array me add, order already ASC hai
    }

    let chatList = [];

    for (const [otherId, messages] of convMap.entries()) {
      const otherUser = await User.findByPk(otherId, {
        attributes: ['id', 'name', 'email', 'role', 'profileImage']
      });

      const lastMessage = messages[messages.length - 1]; // sabse naya

      chatList.push({
        withUser: otherUser || { id: otherId },
        messages,      // ✅ chat screen me use kar sakte ho (latest niche)
        lastMessage
      });
    }

    // ✅ list ko latest conversation se sort karo (WhatsApp style)
    chatList.sort((a, b) => {
      const tA = new Date(a.lastMessage.createdAt).getTime();
      const tB = new Date(b.lastMessage.createdAt).getTime();
      return tB - tA;  // desc
    });

    return res.status(200).json({ success: true, data: chatList });
  } catch (err) {
    console.error('getChatList error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};


// PUT /api/chat/mark-read
exports.markAsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { conversationWith } = req.body; // other user id

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!conversationWith) {
      return res.status(400).json({ success: false, message: 'conversationWith required' });
    }

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
      message: 'Marked as read',
      updated: updatedCount
    });
  } catch (err) {
    console.error('markAsRead error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
