const Request = require("../models/request.model");
const Animal = require("../models/animal.model");

// BUYER sends request
exports.createRequest = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.animalId);
    if (!animal) return res.status(404).json({ message: "Animal not found" });

    if (animal.employerId.toString() === req.user.id.toString()) {
      return res.status(400).json({ message: "You cannot request your own animal" });
    }

    if (animal.status === "sold") {
      return res.status(400).json({ message: "This animal is already sold" });
    }

    // Check if already requested
    const existing = await Request.findOne({
      animalId: req.params.animalId,
      buyerId: req.user.id,
      status: "pending"
    });
    if (existing) return res.status(400).json({ message: "You already sent a request for this animal" });

    const request = await Request.create({
      animalId: req.params.animalId,
      buyerId: req.user.id,
      sellerId: animal.employerId,
      buyerName: req.body.buyerName,
      buyerContact: req.body.buyerContact,
      message: req.body.message
    });

    // Update animal status to pending
    await Animal.findByIdAndUpdate(req.params.animalId, { status: "pending" });

    res.status(201).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SELLER gets all requests for his animals
exports.getSellerRequests = async (req, res) => {
  try {
    const requests = await Request.find({ sellerId: req.user.id })
      .populate("animalId", "name price images location")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// BUYER gets his sent requests
exports.getBuyerRequests = async (req, res) => {
  try {
    const requests = await Request.find({ buyerId: req.user.id })
      .populate("animalId", "name price images location status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SELLER accepts request
exports.acceptRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.sellerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "accepted";
    await request.save();

    // Mark animal as sold
    await Animal.findByIdAndUpdate(request.animalId, { status: "sold" });

    // Reject all other pending requests for same animal
    await Request.updateMany(
      { animalId: request.animalId, _id: { $ne: request._id }, status: "pending" },
      { status: "rejected" }
    );

    res.status(200).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// SELLER rejects request
exports.rejectRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.sellerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "rejected";
    await request.save();

    // Check if any other pending requests exist
    const pendingCount = await Request.countDocuments({
      animalId: request.animalId,
      status: "pending"
    });

    // If no more pending requests set animal back to available
    if (pendingCount === 0) {
      await Animal.findByIdAndUpdate(request.animalId, { status: "available" });
    }

    res.status(200).json({ success: true, request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// BUYER cancels request
exports.cancelRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.buyerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await request.deleteOne();

    // Check if any other pending requests exist
    const pendingCount = await Request.countDocuments({
      animalId: request.animalId,
      status: "pending"
    });

    if (pendingCount === 0) {
      await Animal.findByIdAndUpdate(request.animalId, { status: "available" });
    }

    res.status(200).json({ success: true, message: "Request cancelled" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET requests for specific animal
exports.getAnimalRequests = async (req, res) => {
  try {
    const animal = await Animal.findById(req.params.animalId);
    if (!animal) return res.status(404).json({ message: "Animal not found" });

    if (animal.employerId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const requests = await Request.find({ animalId: req.params.animalId })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};