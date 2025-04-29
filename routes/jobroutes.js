
const express = require('express');
const { 
  createJob, 
  getAllJobs, 
  getJobById, 
  updateJobById, 
  deleteJobById 
} = require('../controllers/jobcontroller');
const { protect } = require('../middleware/auth'); // Middleware for authentication

const router = express.Router();

// Create a new job (Requires authentication)
router.post('/', protect, createJob);

// Get all jobs (No authentication required)
router.get('/', getAllJobs);

// Get a specific job by ID (No authentication required)
router.get('/:id', getJobById);

// Update a job by ID (Requires authentication and authorization)
router.put('/:id', protect, updateJobById);

// Delete a job by ID (Requires authentication and authorization)
router.delete('/:id', protect, deleteJobById);

module.exports = router;
