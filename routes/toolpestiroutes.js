const express = require('express');
const router = express.Router();
const toolpestiController = require('../controllers/toolpesticontroller');

// Create Tool/Pesticide
router.post('/', toolpestiController.verifyToken, toolpestiController.upload.single('image'), toolpestiController.createToolPesti);

// Get All Tools/Pesticides
router.get('/', toolpestiController.getAllToolPesti);

// Get Tool/Pesticide by ID
router.get('/:id', toolpestiController.getToolPestiById);

// Update Tool/Pesticide
router.put('/:id', toolpestiController.verifyToken, toolpestiController.upload.single('image'), toolpestiController.updateToolPestiById);

// Delete Tool/Pesticide
router.delete('/:id', toolpestiController.verifyToken, toolpestiController.deleteToolPestiById);

module.exports = router;
