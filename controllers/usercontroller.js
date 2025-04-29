// controllers/user.controller.js
const User    = require('../models/user');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

// Helper: generate JWT
const generateToken = (user) => {
  return jwt.sign(
    {
      id:       user._id,
      name:     user.name,
      email:    user.email,
      role:     user.role,        // now includes role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

// ─── Register ────────────────────────────────────────────────────────────────
exports.registerUser = async (req, res) => {
  const {
    name,
    email,
    password,
    phoneNumber,
    address,
    role = 'user',                // default role
    lat,                          // optional initial location
    lng
  } = req.body;

  try {
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password:    hashedPassword,
      phoneNumber,
      address,
      role,
      // if delivery, set initial location
      location: {
        type:        'Point',
        coordinates: (role === 'delivery' && lat != null && lng != null)
          ? [lng, lat]
          : [0, 0]
      }
      // isAvailable & currentLoad default via schema
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        address:     user.address,
        role:        user.role,
        location:    user.location,
        isAvailable: user.isAvailable,
        currentLoad: user.currentLoad
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to register user' });
  }
};

// ─── Login ───────────────────────────────────────────────────────────────────
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.status(200).json({
      token,
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        address:     user.address,
        role:        user.role,
        location:    user.location,
        isAvailable: user.isAvailable,
        currentLoad: user.currentLoad
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to login user' });
  }
};

// ─── Logout & Blacklist ─────────────────────────────────────────────────────
let tokenBlacklist = [];

exports.logoutUser = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    tokenBlacklist.push(token);
    return res.status(200).json({ message: 'Logged out successfully' });
  }
  res.status(400).json({ message: 'No token provided' });
};

exports.isTokenBlacklisted = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token && tokenBlacklist.includes(token)) {
    return res.status(401).json({ message: 'Token is invalidated' });
  }
  next();
};

// ─── Get Profile ─────────────────────────────────────────────────────────────
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({
      user: {
        id:          user._id,
        name:        user.name,
        email:       user.email,
        phoneNumber: user.phoneNumber,
        address:     user.address,
        role:        user.role,
        location:    user.location,
        isAvailable: user.isAvailable,
        currentLoad: user.currentLoad
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to fetch profile' });
  }
};

// ─── Update Profile ──────────────────────────────────────────────────────────
exports.updateUserProfile = async (req, res) => {
  const { name, email, phoneNumber, address } = req.body;

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name        = name        || user.name;
    user.email       = email       || user.email;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.address     = address     || user.address;

    const updated = await user.save();
    res.status(200).json({
      user: {
        id:          updated._id,
        name:        updated.name,
        email:       updated.email,
        phoneNumber: updated.phoneNumber,
        address:     updated.address
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to update profile' });
  }
};

// ─── Delete User ─────────────────────────────────────────────────────────────
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to delete user' });
  }
};

// ─── Delivery‑man: Update Location ───────────────────────────────────────────
exports.updateLocation = async (req, res) => {
  const { id }     = req.params;
  const { lat, lng } = req.body;

  try {
    const user = await User.findById(id);
    if (!user || user.role !== 'delivery') {
      return res.status(404).json({ message: 'Delivery man not found' });
    }

    user.location.coordinates = [lng, lat];
    await user.save();

    res.json({ message: 'Location updated', location: user.location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to update location' });
  }
};

// ─── Delivery‑man: Toggle Availability ───────────────────────────────────────
exports.updateAvailability = async (req, res) => {
  const { id }         = req.params;
  const { isAvailable } = req.body;

  try {
    const user = await User.findById(id);
    if (!user || user.role !== 'delivery') {
      return res.status(404).json({ message: 'Delivery man not found' });
    }

    user.isAvailable = isAvailable;
    await user.save();

    res.json({ message: 'Availability updated', isAvailable: user.isAvailable });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error: Unable to update availability' });
  }
};
