const router = require("express").Router();
const controller = require("../controllers/animal.controller");
const upload = require("../middleware/upload.middleware");
const { protect } = require("../middleware/auth.middleware");

// CREATE animal (Protected — logged in user only)
router.post(
  "/",
  protect,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 }
  ]),
  controller.createAnimal
);

// GET all animals (Public)
router.get("/", controller.getAnimals);

// GET animals by employerId (Protected)
router.get("/my", protect, controller.getMyAnimals);

// GET nearby animals (Public)
router.get("/nearby", controller.getNearbyAnimals);

// GET single animal by ID (Public)
router.get("/:id", controller.getAnimalById);

// UPDATE animal (Protected — owner only)
router.put(
  "/:id",
  protect,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "videos", maxCount: 2 }
  ]),
  controller.updateAnimal
);

// DELETE animal (Protected — owner only)
router.delete("/:id", protect, controller.deleteAnimal);

module.exports = router;