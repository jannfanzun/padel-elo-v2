const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload, processProfileImage, handleUploadError } = require('../middleware/uploadMiddleware');
const { 
  getProfile,
  getRankings,
  updateProfile,
  updateProfileImage
} = require('../controllers/userController');

router.get('/profile', protect, getProfile);
router.post('/profile/update', protect, updateProfile);

router.post('/profile/upload-image', 
  protect, 
  upload, 
  processProfileImage, 
  updateProfileImage,
  handleUploadError
);

router.get('/rankings', protect, getRankings);

module.exports = router;