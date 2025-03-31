const rateLimit = require('express-rate-limit');

// Helfer-Funktion, um die verbleibende Zeit benutzerfreundlich zu formatieren
const formatTimeRemaining = (windowMs) => {
  if (windowMs < 60000) { // < 1 Minute
    return 'wenigen Sekunden';
  } else if (windowMs < 3600000) { // < 1 Stunde
    return `${Math.ceil(windowMs / 60000)} Minuten`;
  } else if (windowMs < 86400000) { // < 1 Tag
    return `${Math.ceil(windowMs / 3600000)} Stunden`;
  } else {
    return `${Math.ceil(windowMs / 86400000)} Tagen`;
  }
};

// Anpassbarer Handler für alle Limiter
const createLimitHandler = (message, windowMs, redirectUrl) => {
  return (req, res, next) => {
    const timeString = formatTimeRemaining(windowMs);
    const fullMessage = `${message} Bitte versuche es in ${timeString} erneut.`;
    
    if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
      // API/AJAX-Anfragen erhalten JSON-Antwort
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: fullMessage,
        retryAfter: windowMs / 1000
      });
    } else {
      // Browser-Anfragen werden umgeleitet
      return res.redirect(`${redirectUrl}?error=${encodeURIComponent(fullMessage)}`);
    }
  };
};

// Allgemeiner Limiter (kann für die meisten Routen verwendet werden)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 200, // 100 Anfragen pro Fenster
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler(
    'Zu viele Anfragen von dieser IP-Adresse.',
    15 * 60 * 1000,
    '/'
  )
});

// Login-Limiter
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 5, // 5 Anmeldeversuche pro Stunde
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler(
    'Zu viele Anmeldeversuche.',
    60 * 60 * 1000,
    '/auth/login'
  ),
  skipSuccessfulRequests: true // Erfolgreiche Anfragen nicht zählen
});

// Registrierungs-Limiter
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 3, // 3 Registrierungsversuche pro Stunde
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler(
    'Zu viele Registrierungsversuche.',
    60 * 60 * 1000,
    '/auth/register'
  )
});

// Passwort-Reset-Limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 3, // 3 Passwort-Reset-Anfragen pro Stunde
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler(
    'Zu viele Passwort-Zurücksetzungsversuche.',
    60 * 60 * 1000,
    '/auth/forgot-password'
  )
});

// Spiele-Hinzufügen-Limiter
const addGameLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 Stunde
  max: 20, // 20 Spiele pro Stunde
  standardHeaders: true,
  legacyHeaders: false,
  handler: createLimitHandler(
    'Du hast zu viele Spiele in kurzer Zeit hinzugefügt.',
    60 * 60 * 1000,
    '/game/add'
  )
});

// Admin-Action-Limiter (weniger streng, aber immer noch geschützt)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 30, // 30 Admin-Aktionen pro 15 Minuten
  standardHeaders: true,
  legacyHeaders: false,
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