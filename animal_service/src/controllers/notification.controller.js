const Notification = require("../models/notification.model");
const User = require("../models/user.model");

// GET all notifications for a user
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const notifications = await Notification.find({ userId })
      .populate("animalId", "name images location")
      .populate("postedBy", "name")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET unread notification count
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Notification.countDocuments({ userId, isRead: false });
    res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// MARK notification as read
exports.markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (notification.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// MARK all as read
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// CREATE notification (internal use)
exports.createNotification = async (userId, type, title, message, animalId, postedBy) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      animalId,
      postedBy,
      actionUrl: animalId ? `/animal/${animalId}` : "/"
    });

    await notification.save();
    return notification;
  } catch (err) {
    console.error("Notification creation error:", err.message);
    return null;
  }
};

// DELETE notification
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (notification.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await notification.deleteOne();
    res.status(200).json({ success: true, message: "Notification deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
