const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id, isAdmin = false) => {
  return jwt.sign(
    { id, isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Verify token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};