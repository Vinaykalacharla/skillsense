const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/userModel');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Unauthorized: missing token');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401);
    throw new Error('Unauthorized: token not found');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.status(401);
      throw new Error('Unauthorized: user not found');
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Unauthorized: invalid token');
  }
});

module.exports = { protect };
