const router = require("express").Router();
const controller = require("../controllers/notification.controller");
const { protect } = require("../middleware/auth.middleware");

// GET all notifications
router.get("/", protect, controller.getNotifications);

// GET unread count
router.get("/unread/count", protect, controller.getUnreadCount);

// MARK as read
router.put("/:notificationId/read", protect, controller.markAsRead);

// MARK all as read
router.put("/read/all", protect, controller.markAllAsRead);

// DELETE notification
router.delete("/:notificationId", protect, controller.deleteNotification);

module.exports = router;
