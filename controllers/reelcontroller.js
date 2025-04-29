// controllers/reelcontroller.js
const Reel      = require('../models/Reel');
const cloudinary = require('cloudinary').v2;
const fs         = require('fs');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// Utility: Upload to Cloudinary
async function uploadToCloudinary(filePath, folder, resourceType = 'auto') {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType,
    });
    fs.unlink(filePath, err => {
      if (err) console.error('Failed to delete local file:', err);
    });
    return result.secure_url;
  } catch (error) {
    console.error('Cloudinary error:', error);
    throw new Error('Cloudinary upload failed: ' + error.message);
  }
}

// POST /api/reels
exports.createReel = async (req, res) => {
  try {
    const { description, tags } = req.body;
    const userId = req.user._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let videoUrl = '';
    if (req.file) {
      videoUrl = await uploadToCloudinary(req.file.path, 'reels/videos', 'video');
    }

    const reel = new Reel({
      userId,
      videoUrl,
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    });

    await reel.save();
    res.status(201).json({ message: 'Reel created successfully!', reel });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /api/reels
exports.getAllReels = async (req, res) => {
  try {
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name');
    res.status(200).json(reels);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reels' });
  }
};

// GET /api/reels/:id
exports.getReelById = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate('userId', 'name');
    if (!reel) return res.status(404).json({ message: 'Reel not found' });
    res.status(200).json(reel);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reel' });
  }
};

// PUT /api/reels/:id
exports.updateReel = async (req, res) => {
  try {
    const { description, tags } = req.body;
    const updates = {
      description,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : []
    };

    if (req.file) {
      updates.videoUrl = await uploadToCloudinary(req.file.path, 'reels/videos', 'video');
    }

    const updatedReel = await Reel.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!updatedReel) return res.status(404).json({ message: 'Reel not found' });
    res.status(200).json({ message: 'Reel updated successfully', reel: updatedReel });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /api/reels/:id
exports.deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    // delete from Cloudinary
    if (reel.videoUrl) {
      const publicId = reel.videoUrl
        .split('/')
        .slice(-1)[0]
        .split('.')[0];
      await cloudinary.uploader.destroy(`reels/videos/${publicId}`, {
        resource_type: 'video',
      });
    }

    await reel.remove();
    res.status(200).json({ message: 'Reel deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reel' });
  }
};

// POST /api/reels/:id/like
exports.likeReel = async (req, res) => {
  try {
    const userId = req.user._id;
    const reel   = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    const alreadyLiked = reel.likes.includes(userId);
    if (alreadyLiked) {
      reel.likes = reel.likes.filter(id => id.toString() !== userId.toString());
    } else {
      reel.likes.push(userId);
    }

    await reel.save();
    res.status(200).json({ message: alreadyLiked ? 'Like removed' : 'Reel liked' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
};

// POST /api/reels/:id/comment
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: 'Reel not found' });

    const newComment = {
      userId:   req.user._id,
      text,
      timestamp: new Date(),
    };

    reel.comments.push(newComment);
    await reel.save();
    res.status(201).json({ message: 'Comment added', comment: newComment });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
