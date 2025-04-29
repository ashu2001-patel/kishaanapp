// Chat.js (Mongoose Model)
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  animalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Animal', required: true },
  messages: [messageSchema],
});

module.exports = mongoose.model('Chat', chatSchema);
