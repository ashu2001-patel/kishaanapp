const mongoose = require('mongoose');

const ToolPestiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Tool', 'Pesticide'],
    required: true
  },
  purpose: {
    type: String,
    required: true
  },
  isForRent: {
    type: Boolean,
    default: false
  },
  isForSale: {
    type: Boolean,
    default: true
  },
  price: {
    type: Number,
    required: true
  },
  condition: {
    type: String,
    enum: ['New', 'Used', 'Refurbished'],
    default: 'New'
  },
  description: {
    type: String
  },
  location: {
    type: String
  },
  contact: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String // URL to the image
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ToolPesti', ToolPestiSchema);
