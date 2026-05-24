const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const {
  checkFeature,
  recordUsage,
  getUserStatus,
} = require("../controllers/usage.controller");

// All usage routes require authentication
router.use(protect);

// Check if the user can use a feature and how many free uses remain
// GET /usage/check/:featureKey?referenceId=xxx
router.get("/check/:featureKey", checkFeature);

// Record one free usage after the user successfully used the feature
// POST /usage/record/:featureKey
router.post("/record/:featureKey", recordUsage);

// Get usage status for all features for the current user (dashboard)
// GET /usage/status
router.get("/status", getUserStatus);

module.exports = router;
