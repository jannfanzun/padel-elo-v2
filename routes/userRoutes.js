const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

const { upload, processProfileImageMongo, handleUploadError } = require('../middleware/mongoImageUpload');

const { 
  getProfile,
  getRankings,
  updateProfile,
  updateProfileImage
} = require('../controllers/userController');

router.get('/profile', protect, getProfile);
router.post('/profile/update', protect, updateProfile);

// Updated route with MongoDB image processing
router.post('/profile/upload-image', 
  protect, 
  upload, 
  processProfileImageMongo,  
  updateProfileImage,
  handleUploadError
);

router.get('/rankings', protect, getRankings);

module.exports = router;