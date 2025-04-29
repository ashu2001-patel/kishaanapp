const mongoose = require('mongoose');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

const toolPestiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['tool', 'pesticide'], required: true },
  price: { type: Number, required: true },
  image: { type: String },
  description: { type: String },
  location: { type: String },
  forRent: { type: Boolean, default: false }
}, { timestamps: true });

const ToolPesti = mongoose.model('ToolPesti', toolPestiSchema);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Multer setup for temporary local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads/');
  },
  filename: function (req, file, cb) {
    const randomName = uuidv4();
    cb(null, randomName + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Helper: Upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder = 'tools_pesticides') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlink(filePath, (err) => {
      if (err) console.error('Failed to delete local file:', err);
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload to Cloudinary');
  }
};

// Helper: JWT Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied: No token provided' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET); // Use environment secret
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Invalid token' });
  }
};

// ================== Controller Functions ==================

// CREATE
exports.createToolPesti = async (req, res) => {
  try {
    const { name, type, price, description, location, forRent } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = await uploadToCloudinary(req.file.path);
    }

    const newItem = new ToolPesti({
      name,
      type,
      price,
      description,
      location,
      forRent,
      image: imageUrl,
    });

    await newItem.save();
    res.status(201).json({ message: 'Item created successfully', item: newItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// READ ALL (with optional filters)
exports.getAllToolPesti = async (req, res) => {
  try {
    const { type, location, forRent, minPrice, maxPrice, search } = req.query;

    let query = {};

    if (type) query.type = type;
    if (location) query.location = { $regex: location, $options: 'i' };
    if (forRent !== undefined) query.forRent = forRent === 'true';
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const items = await ToolPesti.find(query).sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// READ BY ID
exports.getToolPestiById = async (req, res) => {
  try {
    const item = await ToolPesti.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// UPDATE BY ID
exports.updateToolPestiById = async (req, res) => {
  try {
    const { name, type, price, description, location, forRent } = req.body;

    let updateData = { name, type, price, description, location, forRent };

    if (req.file) {
      const imageUrl = await uploadToCloudinary(req.file.path);
      updateData.image = imageUrl;
    }

    const updatedItem = await ToolPesti.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE BY ID
exports.deleteToolPestiById = async (req, res) => {
  try {
    const item = await ToolPesti.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Optionally delete image from Cloudinary (if you want)
    // (You need to save public_id instead of URL if you want full delete.)

    await ToolPesti.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ================== Export Helper Upload Middleware ==================
exports.upload = upload;
exports.verifyToken = verifyToken;
