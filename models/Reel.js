// models/Reel.js
const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // References the User model
    required: true,
  },
  videoUrl: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    maxlength: 300, // Limit the description length
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Users who liked this reel
    }
  ],
  comments: [
    {
      userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
      },
      text: { 
        type: String, 
        required: true 
      },
      timestamp: { 
        type: Date, 
        default: Date.now 
      },
    }
  ],
  tags: [
    {
      type: String, // Tags or categories for the reel
    }
  ],
  views: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Reel', reelSchema);
