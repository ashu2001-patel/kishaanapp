const router = require("express").Router();
const { protect, adminOnly } = require("../middleware/auth.middleware");
const { getAll, getOne, update } = require("../controllers/config.controller");

// Public — frontend reads these to show limits in the UI
router.get("/",          getAll);
router.get("/:featureKey", getOne);

// Admin only — change limits/prices without a code deploy
router.put("/:featureKey", protect, adminOnly, update);

module.exports = router;
