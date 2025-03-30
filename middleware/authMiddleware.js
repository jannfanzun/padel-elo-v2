const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../config/jwt');

// Protect routes - user must be logged in
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in cookies or authorization header
    if (req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }

    // Grant access to protected route
    req.user = user;
    res.locals.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    
    // Check if user is admin when required
    if (roles.includes('admin') && !req.user.isAdmin) {
      return res.status(403).render('error', { 
        title: 'Forbidden',
        message: 'You do not have permission to access this resource'
      });
    }
    
    next();
  };
};