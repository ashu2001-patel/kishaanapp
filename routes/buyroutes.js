const express = require('express');
const {
  createPurchase,
  getPurchasesByBuyer,
  getPurchaseById,
  updatePurchaseStatus,
} = require('../controllers/buycontroller');
const { protect } = require('../middleware/auth'); // Assuming you have a middleware for authentication

const router = express.Router();

// Create a new animal purchase (Public route)
router.post('/', createPurchase);

// Get all purchases for a buyer
router.get('/buyer/:buyerName', protect, getPurchasesByBuyer);

// Get a specific purchase by ID
router.get('/:id', protect, getPurchaseById);

// Update the status of a purchase (e.g., mark as completed)
router.put('/:id', protect, updatePurchaseStatus);

module.exports = router;
