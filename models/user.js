const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },

  // ——— NEW FIELDS ———
  role: {
    type: String,
    enum: ['user', 'delivery'],
    default: 'user'
  },
  location: {
    // GeoJSON Point: [ lng, lat ]
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  // only meaningful if role === 'delivery'
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLoad: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// create 2dsphere index so you can do near‑queries
userSchema.index({ location: '2dsphere' });

// Hash the password before saving the user
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match user entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
