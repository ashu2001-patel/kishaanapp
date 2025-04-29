const mongoose = require('mongoose');

// Define Job schema
const jobSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
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
  requiredSkills: [String],
  wage: {
    type: Number,
    required: true
  },
  mobile:{
type :String,
 required: true
  },
  status: {
    type: String,
    enum: ['open', 'filled', 'closed'],
    default: 'open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update `updatedAt` before saving
jobSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now();
  }
  next();
});

// Create Job model
const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
