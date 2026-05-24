// src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  try {
    const auth = req.headers.authorization || req.headers.Authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = auth.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token' });

    // verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // normalize possible id fields from different token shapes
    const userId = decoded.id || decoded._id || decoded.userId || decoded.sub;
    if (!userId) {
      console.error('Token decoded but no id present', decoded);
      return res.status(401).json({ message: 'Token payload missing user id' });
    }

    // attach minimal user info to request (do not call user DB from animal-service)
    req.user = { id: userId, role: decoded.role || decoded.roles || null };

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token', error: err.message });
  }
};
