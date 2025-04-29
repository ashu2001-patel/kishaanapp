const mongoose = require('mongoose');

// Define Animal schema
const animalSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,  // Price should be a number to allow calculations
    required: true
  },
  description: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  contact: {
    type: String,
    required: true
  },
  images: [{
    type: String,  // Allow multiple images
    required: false // Make this optional if images aren't always provided
  }],
  videos: [{
    type: String,  // Allow multiple videos
    required: false // Make this optional if videos aren't always provided
  }],
  availabilityStatus: {
    type: String,
    enum: ['available', 'sold'],
    default: 'available'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'  // Reference to the User model
  },
  datePosted: {
    type: Date,
    default: Date.now
  }
});

// Create the model
const Animal = mongoose.model('Animal', animalSchema);

module.exports = Animal;
