// routes/tournamentRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/authMiddleware');
const { 
    getTournamentGenerator,
    postGenerateTournament,
    validateTournamentGeneration
} = require('../controllers/tournamentController');

// Rate Limiting für Tournament Generation
const tournamentGenerationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 10, // Max 10 Tournament-Generierungen pro 15 Minuten pro User
  message: {
    success: false,
    message: 'Zu viele Tournament-Generierungen. Bitte warten Sie 15 Minuten.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Benutzerspezifisches Rate Limiting
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  // Nur bei Fehlern zählen
  skipSuccessfulRequests: true
});

// Spezielle Rate Limiting für Tournament Page
const tournamentPageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 Minute
  max: 30, // Max 30 Seitenzugriffe pro Minute
  message: {
    title: 'Zu viele Anfragen',
    message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security Headers Middleware für Tournament Routes
const securityHeaders = (req, res, next) => {
  // Zusätzliche Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP für Tournament Pages
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; " +
    "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self';"
  );
  
  next();
};

// Input Sanitization Middleware
const sanitizeInput = (req, res, next) => {
  if (req.body) {
    // Entferne potentiell gefährliche Zeichen
    const sanitize = (obj) => {
      for (let key in obj) {
        if (typeof obj[key] === 'string') {
          // Basis XSS-Schutz
          obj[key] = obj[key]
            .replace(/[<>\"']/g, '')
            .trim()
            .substring(0, 1000); // Max length limit
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitize(obj[key]);
        }
      }
    };
    
    sanitize(req.body);
  }
  next();
};

// Logging Middleware für Tournament-Aktionen
const logTournamentActivity = (req, res, next) => {
  const originalSend = res.json;
  
  res.json = function(data) {
    // Log successful tournament generations
    if (data && data.success && req.route.path === '/generate') {
      console.log(`Tournament generated successfully by user ${req.user.username} (${req.user._id}) at ${new Date().toISOString()}`);
    }
    
    // Log failed attempts
    if (data && !data.success && req.route.path === '/generate') {
      console.log(`Tournament generation failed for user ${req.user.username} (${req.user._id}): ${data.message}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Tournament generator page (Admin only)
router.get('/generator',
  tournamentPageLimiter,
  securityHeaders,
  protect,
  authorize('admin'),
  getTournamentGenerator
);

// Generate tournament (API endpoint - Admin only)
router.post('/generate',
  tournamentGenerationLimiter,
  securityHeaders,
  protect,
  authorize('admin'),
  sanitizeInput,
  validateTournamentGeneration,
  logTournamentActivity,
  postGenerateTournament
);

// Health check endpoint (für Monitoring)
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'tournament-service'
  });
});

// Error handling für Tournament Routes
router.use((error, req, res, next) => {
  console.error('Tournament Route Error:', error);
  
  // Rate limit errors
  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      message: 'Zu viele Anfragen. Bitte warten Sie.'
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validierungsfehler',
      errors: error.errors
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Server-Fehler beim Verarbeiten der Tournament-Anfrage'
  });
});

module.exports = router;