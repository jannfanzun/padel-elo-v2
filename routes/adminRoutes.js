const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { adminLimiter } = require('../middleware/rateLimitMiddleware');
const {
  getDashboard,
  manageUsers,
  deleteUser,
  manageGames,
  deleteGame,
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  getGameReports,
  deleteGameReport,
  resetSystem,
  recalculateELO,
  getEmailExport,
  getPadelSchedule,
  savePadelSchedule,
  publishPadelSchedule,
  getActiveScheduleAPI
} = require('../controllers/adminController');

// Apply admin protection to all routes
router.use(protect);
router.use(authorize('admin'));

// Dashboard route
router.get('/dashboard', getDashboard);

// User management routes
router.get('/users', manageUsers);
router.post('/users/:id/delete', deleteUser);

// Game management routes
router.get('/games', manageGames);
router.post('/games/:id/delete', deleteGame);

// Registration request routes
router.get('/registration-requests', getRegistrationRequests);
router.post('/registration-requests/:id/approve', approveRegistrationRequest);
router.post('/registration-requests/:id/reject', rejectRegistrationRequest);

router.get('/game-reports', getGameReports);
router.post('/game-reports/:id/delete', deleteGameReport);

// Email export route
router.get('/email-export', getEmailExport);

router.post('/reset-system', adminLimiter, resetSystem);
router.post('/recalculate-elo', adminLimiter, recalculateELO);

// Padel Schedule routes
router.get('/padel-schedule', getPadelSchedule);
router.post('/padel-schedule/save', savePadelSchedule);
router.post('/padel-schedule/publish', publishPadelSchedule);


module.exports = router;