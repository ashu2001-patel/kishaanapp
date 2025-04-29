const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Set destination for temp storage

// Your POST route for creating an animal listing

const {
  createAnimal,
  getAllAnimals,
  getAnimalById,
  updateAnimalById,
  deleteAnimalById,
} = require('../controllers/animalcontroller'); // Importing controller functions
const { protect } = require('../middleware/auth'); 
const router = express.Router();


// Route to create a new animal listing (POST /api/animals)
router.post('/',protect, upload.fields([
  { name: 'images[]', maxCount: 10 },
  { name: 'videos[]', maxCount: 5 },
]), createAnimal);

// Route to get all animal listings (GET /api/animals)
router.get('/', getAllAnimals);

// Route to get a specific animal by ID (GET /api/animals/:id)
router.get('/:id', getAnimalById);

// Route to update an animal listing by ID (PUT /api/animals/:id)
router.put('/:id', updateAnimalById);

// Route to delete an animal listing by ID (DELETE /api/animals/:id)
router.delete('/:id', deleteAnimalById);

module.exports = router;
