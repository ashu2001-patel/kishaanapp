const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["animal_posted", "animal_updated", "animal_nearby"],
    default: "animal_posted"
  },
  title: String,
  message: String,
  animalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Animal"
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  isRead: {
    type: Boolean,
    default: false
  },
  actionUrl: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
