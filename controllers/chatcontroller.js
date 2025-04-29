// chatController.js
const Chat = require('../models/Chat');

// Start or get a chat
exports.startChat = async (req, res) => {
  const { animalId } = req.body;
  const buyerId = req.user._id; // Assuming req.user is populated by authentication middleware
  const animal = await Animal.findById(animalId).populate('employerId');

  if (!animal) return res.status(404).json({ message: 'Animal not found' });

  const sellerId = animal.employerId;

  // Check if a chat already exists between buyer and seller for this animal
  let chat = await Chat.findOne({ buyerId, sellerId, animalId });
  if (!chat) {
    chat = new Chat({ buyerId, sellerId, animalId });
    await chat.save();
  }

  res.status(200).json(chat);
};

// Send a message
exports.sendMessage = async (req, res) => {
  const { chatId, text } = req.body;
  const senderId = req.user._id;

  const chat = await Chat.findById(chatId);
  if (!chat) return res.status(404).json({ message: 'Chat not found' });

  chat.messages.push({ senderId, text });
  await chat.save();

  res.status(200).json(chat);
};
