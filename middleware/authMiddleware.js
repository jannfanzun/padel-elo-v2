const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../config/jwt');

// Protect routes - user must be logged in
exports.protect = async (req, res, next) => {
  try {
    let token;
    let isSpecialToken = false;
    
    // Check for token in URL query parameter (for email links)
    if (req.query.token) {
      token = req.query.token;
      isSpecialToken = true;
    }
    // Check for token in cookies or authorization header
    else if (req.cookies.token) {
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

    // For special tokens from email links, verify directly with jwt
    let decoded;
    if (isSpecialToken) {
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if it's a special game-report access token
        if (decoded.purpose === 'game-report-access') {
          // For game report direct access, use admin account
          const adminUser = await User.findById(decoded.id);
          
          if (!adminUser || !adminUser.isAdmin) {
            throw new Error('Invalid admin token');
          }
          
          // Only allow access to the specific game
          const gameId = req.path.split('/').pop();
          if (decoded.gameId !== gameId) {
            throw new Error('Token is not valid for this game');
          }
          
          // Set admin user and continue
          req.user = adminUser;
          res.locals.user = adminUser;
          return next();
        }
      } catch (err) {
        console.error('Special token verification error:', err);
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
      }
    } else {
      // Regular token verification
      decoded = verifyToken(token);
      
      if (!decoded) {
        req.session.returnTo = req.originalUrl;
        return res.redirect('/auth/login');
      }
    }

    // Check if user still exists (for regular tokens)
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

// Middleware for auth routes - redirects if user is already logged in
exports.redirectIfAuthenticated = async (req, res, next) => {
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

    // If no token, continue to login/register page
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return next();
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return next();
    }

    // User is authenticated, redirect based on role
    if (user.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/user/profile');
  } catch (error) {
    console.error('Auth redirect middleware error:', error);
    next();
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