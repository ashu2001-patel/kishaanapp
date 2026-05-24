const router = require("express").Router();
const controller = require("../controllers/request.controller");
const { protect } = require("../middleware/auth.middleware");

// Buyer sends request for an animal
router.post("/animal/:animalId/request", protect, controller.createRequest);

// Seller gets all requests for his animals
router.get("/seller/requests", protect, controller.getSellerRequests);

// Buyer gets his sent requests
router.get("/buyer/requests", protect, controller.getBuyerRequests);

// Get requests for specific animal (seller only)
router.get("/animal/:animalId/requests", protect, controller.getAnimalRequests);

// Seller accepts request
router.patch("/request/:requestId/accept", protect, controller.acceptRequest);

// Seller rejects request
router.patch("/request/:requestId/reject", protect, controller.rejectRequest);

// Buyer cancels request
router.delete("/request/:requestId/cancel", protect, controller.cancelRequest);

module.exports = router;