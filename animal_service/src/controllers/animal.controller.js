const { v4: uuidv4 } = require("uuid");
const Animal = require("../models/animal.model");
const axios = require("axios");
const notificationController = require("./notification.controller");
const { createMediaRecord, getMediaByIds } = require("../utils/mediaService");

const getCoordinatesFromLocation = async (locationName) => {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: locationName,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "RuralCompanyApp/1.0"
      }
    });

    if (response.data.length > 0) {
      const { lat, lon, display_name } = response.data[0];
      return {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon),
        address: display_name
      };
    }
    return null;
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return null;
  }
};

const hideContactDetails = (animal, isAuthenticated) => {
  if (isAuthenticated) return animal;
  const animalObj = animal.toObject ? animal.toObject() : { ...animal };
  animalObj.contact = null;
  return animalObj;
};

const notifyAllUsers = async (animalId, animalName, employerId) => {
  try {
    const User = require("../models/user.model");
    const allUsers = await User.find({ _id: { $ne: employerId } }, "_id");

    for (const user of allUsers) {
      await notificationController.createNotification(
        user._id,
        "animal_posted",
        "New Animal Posted",
        `A new ${animalName} has been posted for sale near you!`,
        animalId,
        employerId
      );
    }
  } catch (err) {
    console.error("Error creating notifications:", err.message);
  }
};

const buildMediaRecords = async (files = [], animalId, fileType) => {
  const urls = [];
  const mediaIds = [];

  for (const f of files) {
    const mediaId = uuidv4();
    urls.push(f.location);
    mediaIds.push(mediaId);

    createMediaRecord({
      mediaId,
      animalId,
      originalKey: f.key,
      originalUrl: f.location,
      fileType,
      mimeType: f.mimetype,
    }).catch((err) => console.error(`[mediaService] Failed to create DynamoDB record for ${mediaId}:`, err.message));
  }

  return { urls, mediaIds };
};

const mergeProcessedUrls = (animalObj, mediaRecords) => {
  if (!mediaRecords || mediaRecords.length === 0) return animalObj;

  const byOriginalUrl = {};
  for (const record of mediaRecords) {
    if (record.originalUrl) {
      byOriginalUrl[record.originalUrl] = record;
    }
  }

  const replaceUrl = (rawUrl) => {
    const record = byOriginalUrl[rawUrl];
    if (!record || record.status !== "completed") return rawUrl;
    return record.processedUrls?.medium || record.processedUrls?.original || rawUrl;
  };

  return {
    ...animalObj,
    images: (animalObj.images || []).map(replaceUrl),
    videos: (animalObj.videos || []).map(replaceUrl),
  };
};

// CREATE animal
exports.createAnimal = async (req, res) => {
  try {
    const imageFiles = req.files?.images || [];
    const videoFiles = req.files?.videos || [];

    const coordinates = await getCoordinatesFromLocation(req.body.location);

    const animal = new Animal({
      employerId: req.user.id,
      name: req.body.name,
      price: req.body.price,
      description: req.body.description,
      location: req.body.location,
      coordinates: coordinates || { latitude: null, longitude: null, address: null },
      contact: req.body.contact,
      images: imageFiles.map((f) => f.location),
      videos: videoFiles.map((f) => f.location),
      mediaIds: [],
    });

    await animal.save();

    const animalIdStr = animal._id.toString();
    const { mediaIds: imageMediaIds } = await buildMediaRecords(imageFiles, animalIdStr, "image");
    const { mediaIds: videoMediaIds } = await buildMediaRecords(videoFiles, animalIdStr, "video");

    const allMediaIds = [...imageMediaIds, ...videoMediaIds];

    if (allMediaIds.length > 0) {
      animal.mediaIds = allMediaIds;
      await animal.save();
    }

    notifyAllUsers(animal._id, animal.name, req.user.id);

    res.status(201).json({ success: true, animal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET all animals (with optional filters)
exports.getAnimals = async (req, res) => {
  try {
    const { name, location, minPrice, maxPrice } = req.query;

    const filter = {};
    if (name) filter.name = { $regex: name, $options: "i" };
    if (location) filter.location = { $regex: location, $options: "i" };
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const animals = await Animal.find(filter).sort({ createdAt: -1 });
    const isAuthenticated = !!req.user;

    const allMediaIds = animals.flatMap((a) => a.mediaIds || []);
    let mediaRecords = [];

    if (allMediaIds.length > 0) {
      try {
        mediaRecords = await getMediaByIds(allMediaIds);
      } catch (dynamoErr) {
        console.error("[getAnimals] DynamoDB batch fetch failed:", dynamoErr.message);
      }
    }

    const filteredAnimals = animals.map((animal) => {
      let obj = hideContactDetails(animal, isAuthenticated);
      if ((animal.mediaIds || []).length > 0) {
        obj = mergeProcessedUrls(obj, mediaRecords);
      }
      return obj;
    });

    res.status(200).json({ success: true, count: filteredAnimals.length, animals: filteredAnimals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET single animal by ID
exports.getAnimalById = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ success: false, message: "Animal not found" });
    }

    const isAuthenticated = !!req.user;
    let animalObj = hideContactDetails(animal, isAuthenticated);

    if (animal.mediaIds && animal.mediaIds.length > 0) {
      try {
        const mediaRecords = await getMediaByIds(animal.mediaIds);
        animalObj = mergeProcessedUrls(animalObj, mediaRecords);
      } catch (dynamoErr) {
        console.error("[getAnimalById] DynamoDB fetch failed, using raw URLs:", dynamoErr.message);
      }
    }

    res.status(200).json({ success: true, animal: animalObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET animals by employerId
exports.getMyAnimals = async (req, res) => {
  try {
    const userId = req.user.id;

    const animals = await Animal.find({ employerId: userId })
      .sort({ createdAt: -1 });

    const allMediaIds = animals.flatMap((a) => a.mediaIds || []);
    let mediaRecords = [];

    if (allMediaIds.length > 0) {
      try {
        mediaRecords = await getMediaByIds(allMediaIds);
      } catch (dynamoErr) {
        console.error("[getMyAnimals] DynamoDB batch fetch failed:", dynamoErr.message);
      }
    }

    const enrichedAnimals = animals.map((animal) => {
      let obj = animal.toObject ? animal.toObject() : { ...animal };
      if ((animal.mediaIds || []).length > 0) {
        obj = mergeProcessedUrls(obj, mediaRecords);
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      count: enrichedAnimals.length,
      animals: enrichedAnimals
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

// UPDATE animal (owner only)
exports.updateAnimal = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ success: false, message: "Animal not found" });
    }

    if (animal.employerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this animal" });
    }

    let images = animal.images;
    let videos = animal.videos;
    let newMediaIds = [...(animal.mediaIds || [])];

    if (req.files?.images?.length) {
      const { urls, mediaIds } = await buildMediaRecords(req.files.images, req.params.id, "image");
      images = urls;
      newMediaIds = [...(animal.mediaIds || []), ...mediaIds];
    }
    if (req.files?.videos?.length) {
      const { urls, mediaIds } = await buildMediaRecords(req.files.videos, req.params.id, "video");
      videos = urls;
      newMediaIds = [...(animal.mediaIds || []), ...mediaIds];
    }

    const newLocation = req.body.location || animal.location;
    const coordinates = newLocation !== animal.location
      ? await getCoordinatesFromLocation(newLocation)
      : animal.coordinates;

    const updatedAnimal = await Animal.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || animal.name,
        price: req.body.price || animal.price,
        description: req.body.description || animal.description,
        location: newLocation,
        coordinates: coordinates || animal.coordinates,
        contact: req.body.contact || animal.contact,
        images,
        videos,
        mediaIds: newMediaIds
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, animal: updatedAnimal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE animal (owner only)
exports.deleteAnimal = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.id);
    if (!animal) {
      return res.status(404).json({ success: false, message: "Animal not found" });
    }

    if (animal.employerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this animal" });
    }

    await animal.deleteOne();
    res.status(200).json({ success: true, message: "Animal deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET nearby animals
exports.getNearbyAnimals = async (req, res) => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: "Latitude and longitude required" });
    }

    const coordinates = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude)
    };

    const nearbyAnimals = await Animal.findNearby(coordinates, parseFloat(radius));
    const isAuthenticated = !!req.user;

    const allMediaIds = nearbyAnimals.flatMap((a) => a.mediaIds || []);
    let mediaRecords = [];

    if (allMediaIds.length > 0) {
      try {
        mediaRecords = await getMediaByIds(allMediaIds);
      } catch (dynamoErr) {
        console.error("[getNearbyAnimals] DynamoDB batch fetch failed:", dynamoErr.message);
      }
    }

    const filteredAnimals = nearbyAnimals.map((animal) => {
      let obj = hideContactDetails(animal, isAuthenticated);
      if ((animal.mediaIds || []).length > 0) {
        obj = mergeProcessedUrls(obj, mediaRecords);
      }
      return obj;
    });

    res.status(200).json({ success: true, count: filteredAnimals.length, animals: filteredAnimals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
