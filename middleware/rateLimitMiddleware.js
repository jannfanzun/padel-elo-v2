const rateLimit = require('express-rate-limit');

// Helfer-Funktion für benutzerfreundliche Zeitanzeige
const formatTimeRemaining = (windowMs) => {
  if (windowMs < 60000) { // < 1 Minute
    return 'wenigen Sekunden';
  } else if (windowMs < 3600000) { // < 1 Stunde
    return `${Math.ceil(windowMs / 60000)} Minuten`;
  } else {
    return `${Math.ceil(windowMs / 3600000)} Stunden`;
  }
};

// Verbesserter Handler für individuelle User-Beschränkung
const createLimitHandler = (message, windowMs, redirectUrl) => {
  return (req, res, next) => {
    const timeString = formatTimeRemaining(windowMs);
    const fullMessage = `${message} Bitte versuche es in ${timeString} erneut.`;
    
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: fullMessage,
        retryAfter: windowMs / 1000
      });
    } else {
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(fullMessage)}`);
    }
  };
};

// Allgemeiner Limiter (nutzt IP-basierte Begrenzung)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 200, // Max Anfragen pro IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Explizit IP als Key nutzen
  handler: createLimitHandler(
    'Zu viele Anfragen von dieser IP-Adresse.',
    15 * 60 * 1000,
    '/'
  )
});

// Login-Limiter - 15 Minuten statt 1 Stunde
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5, // 5 Anmeldeversuche pro IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // IP als Key
  handler: createLimitHandler(
    'Zu viele Anmeldeversuche.',
    15 * 60 * 1000,
    '/auth/login'
  ),
  skipSuccessfulRequests: true // Erfolgreiche Anfragen nicht zählen
});

// Registrierungs-Limiter - 15 Minuten
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 3, // 3 Registrierungsversuche
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: createLimitHandler(
    'Zu viele Registrierungsversuche.',
    15 * 60 * 1000,
    '/auth/register'
  )
});

// Passwort-Reset-Limiter - 15 Minuten
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 3, // 3 Passwort-Reset-Anfragen
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  handler: createLimitHandler(
    'Zu viele Passwort-Zurücksetzungsversuche.',
    15 * 60 * 1000,
    '/auth/forgot-password'
  )
});

// Spiele-Hinzufügen-Limiter - Nutzt User-ID wenn verfügbar, sonst IP
const addGameLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 20, // 20 Spiele pro Zeitfenster
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Nutze User-ID wenn authentifiziert, sonst IP
    return req.user ? req.user._id.toString() : req.ip;
  },
  handler: createLimitHandler(
    'Du hast zu viele Spiele in kurzer Zeit hinzugefügt.',
    15 * 60 * 1000,
    '/game/add'
  )
});

// Admin-Action-Limiter - Nutzt Admin-ID
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 30, // 30 Admin-Aktionen
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? req.user._id.toString() : req.ip;
  },
  handler: createLimitHandler(
    'Zu viele Admin-Aktionen in kurzer Zeit.',
    15 * 60 * 1000,
    '/admin/dashboard'
  )
});

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  addGameLimiter,
  adminLimiter
};