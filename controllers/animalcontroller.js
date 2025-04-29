const express = require('express');
const multer = require('multer');

const { v4: uuidv4 } = require('uuid');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const Animal = require('../models/Animal');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
const checkCloudinaryConnection = async () => {
  try {
    // Test connection with Cloudinary's admin.ping() method
    const result = await cloudinary.api.ping();
    console.log('Cloudinary connection successful:', result);
  } catch (error) {
    console.error('Cloudinary connection failed:', error.message);
  }
};

// Call the function to check the connection
checkCloudinaryConnection()

// Multer storage configuration for temporary local storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    const random = uuidv4();
    cb(null, random + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });
console.log(storage);

// Function to upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder, resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: resourceType, // 'image' or 'video', or 'auto'
    });
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Failed to delete local file:', err);
      } else {
        console.log('Local file deleted after upload');
      }
    });
    return result.secure_url; // Return the URL of the uploaded file
  } catch (error) {
    console.error('Cloudinary error:', error); // Log the detailed error
    throw new Error('Failed to upload to Cloudinary: ' + error.message);
  }
};


// POST route for creating a new animal listing
exports.createAnimal = async (req, res) => {
  try {
    const { name, price, description, location, contact } = req.body;

    // Initialize arrays to store uploaded images and videos URLs
    const images = [];
    const videos = [];

    // Process uploaded images
    if (req.files && req.files['images[]']) {
      const imageFiles = Array.isArray(req.files['images[]']) ? req.files['images[]'] : [req.files['images[]']];
      for (const file of imageFiles) {
        const imageUrl = await uploadToCloudinary(file.path, 'animals/images');
        console.log('Uploaded image URL:', imageUrl);
        images.push(imageUrl);
      }
    } else {
      console.log('No images uploaded.');
    }

    // Process uploaded videos
    if (req.files && req.files['videos[]']) {
      const videoFiles = Array.isArray(req.files['videos[]']) ? req.files['videos[]'] : [req.files['videos[]']];
      for (const file of videoFiles) {
        const videoUrl = await uploadToCloudinary(file.path, 'animals/videos', 'video');
        console.log('Uploaded video URL:', videoUrl);
        videos.push(videoUrl);
      }
    } else {
      console.log('No videos uploaded.');
    }

    // Create new Animal with employerId
    const animal = new Animal({
      employerId: req.user._id, // Include employerId from authenticated user
      name,
      price,
      description,
      location,
      contact,
      images,
      videos,
    });

    await animal.save();
    res.status(201).json({ message: 'Animal posted successfully!', animal });
    console.log(animal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// GET route to fetch all animals
exports.getAllAnimals = async (req, res) => {
  try {
    const animals = await Animal.find();
    res.status(200).json(animals);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET route to fetch a specific animal by ID
exports.getAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }
    res.status(200).json(animal);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT route to update an animal listing by ID
exports.updateAnimalById = async (req, res) => {
  try {
    const { name, price, description, location, contact } = req.body;

    const images = [];
    const videos = [];

    // Process new images uploaded
    if (req.files && req.files['images[]']) {
      for (const file of req.files['images[]']) {
        const imageUrl = await uploadToCloudinary(file.path, 'animals/images');
        images.push(imageUrl);
      }
    }

    // Process new videos uploaded
    if (req.files && req.files['videos[]']) {
      for (const file of req.files['videos[]']) {
        const videoUrl = await uploadToCloudinary(file.path, 'animals/videos', 'video');
        videos.push(videoUrl);
      }
    }

    const updatedData = {
      name,
      price,
      description,
      location,
      contact,
      ...(images.length ? { images } : {}), // Only update if new images were uploaded
      ...(videos.length ? { videos } : {}), // Only update if new videos were uploaded
    };

    const updatedAnimal = await Animal.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updatedAnimal) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    res.status(200).json({ message: 'Animal updated successfully', animal: updatedAnimal });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE route to delete an animal listing by ID
exports.deleteAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ message: 'Animal not found' });
    }

    // Function to remove a file from Cloudinary
    const deleteFromCloudinary = async (fileUrl) => {
      const publicId = fileUrl.split('/').pop().split('.')[0]; // Extract public ID from URL
      await cloudinary.uploader.destroy(publicId);
    };

    // Remove images from Cloudinary
    for (const imageUrl of animal.images) {
      await deleteFromCloudinary(imageUrl);
    }

    // Remove videos from Cloudinary
    for (const videoUrl of animal.videos) {
      await deleteFromCloudinary(videoUrl);
    }

    await Animal.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Animal deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
