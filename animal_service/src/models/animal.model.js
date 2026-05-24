const mongoose = require("mongoose");

const animalSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: String,
  price: Number,
  description: String,
  location: String,
  coordinates: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  contact: String,
  images: [String],
  videos: [String],
  mediaIds: [String],
  status: {
    type: String,
    enum: ["available", "sold", "pending"],
    default: "available"
  }
}, { timestamps: true });

animalSchema.methods.distanceTo = function(otherCoordinates) {
  const R = 6371;
  const lat1 = this.coordinates.latitude;
  const lon1 = this.coordinates.longitude;
  const lat2 = otherCoordinates.latitude;
  const lon2 = otherCoordinates.longitude;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return Math.round(R * c * 10) / 10;
};

animalSchema.statics.findNearby = function(coordinates, radiusKm = 50) {
  return this.find({
    "coordinates.latitude": { $exists: true },
    "coordinates.longitude": { $exists: true }
  }).then(animals => {
    return animals
      .map(animal => ({
        ...animal.toObject(),
        distance: animal.distanceTo(coordinates)
      }))
      .filter(animal => animal.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);
  });
};

module.exports = mongoose.model("Animal", animalSchema);