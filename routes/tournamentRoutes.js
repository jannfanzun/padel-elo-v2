// routes/tournamentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
    getTournamentGenerator,
    postGenerateTournament
} = require('../controllers/tournamentController');

// Tournament generator page
router.get('/generator', protect, getTournamentGenerator);

// Generate tournament (API endpoint for future use)
router.post('/generate', protect, postGenerateTournament);

module.exports = router;