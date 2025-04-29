const mongoose = require('mongoose');

const animalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true }, // Changed to Number for consistency with pricing
  description: { type: String, required: true },
  location: { type: String, required: true },
  contact: { type: String, required: true },
  images: [{ type: String }], // Array of image URLs
  videos: [{ type: String }], // Array of video URLs
}, { timestamps: true });

module.exports = mongoose.model('Animal', animalSchema);
