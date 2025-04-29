// routes/reelroutes.js
const express = require('express');
const multer  = require('multer');
const router  = express.Router();

const {
  createReel,     // was uploadReel
  getAllReels,
  getReelById,
  updateReel,
  deleteReel,
  likeReel,
  addComment     // was commentOnReel
} = require('../controllers/reelcontroller');

// Multer storage setup
const storage = multer.diskStorage({
  destination: 'uploads/videos/',
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage });

// Create a new reel (video upload)
router.post('/', upload.single('video'), createReel);

// List all reels
router.get('/', getAllReels);

// Get a single reel by ID
router.get('/:id', getReelById);

// Update a reel (with optional new video)
router.put('/:id', upload.single('video'), updateReel);

// Delete a reel
router.delete('/:id', deleteReel);

// Like / unlike a reel
router.post('/:id/like', likeReel);

// Add a comment to a reel
router.post('/:id/comment', addComment);

module.exports = router;
