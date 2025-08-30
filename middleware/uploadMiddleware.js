const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Multer configuration for memory storage
const storage = multer.memoryStorage();

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Nur JPEG, PNG und WebP Dateien sind erlaubt'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit (will be compressed anyway)
    files: 1
  }
}).single('profileImage');

// Profile image processing middleware
const processProfileImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const userId = req.user._id.toString();
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
    
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true });

    // Generate filename
    const filename = `profile-${userId}-${Date.now()}.webp`;
    const filepath = path.join(uploadsDir, filename);

    // Process and compress image with Sharp
    await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({
        quality: 80,
        effort: 6
      })
      .toFile(filepath);

    // Delete old profile image if exists
    if (req.user.profileImage) {
      const oldImagePath = path.join(__dirname, '..', 'public', req.user.profileImage);
      try {
        await fs.unlink(oldImagePath);
      } catch (err) {
        // Ignore error if file doesn't exist
        console.log('Old profile image not found or already deleted');
      }
    }

    // Add processed file info to request
    req.processedImage = {
      filename: filename,
      path: `/uploads/profiles/${filename}`
    };

    next();
  } catch (error) {
    console.error('Image processing error:', error);
    next(new Error('Fehler beim Verarbeiten des Bildes'));
  }
};

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.redirect('/user/profile?error=Datei ist zu groß (max. 5MB)');
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.redirect('/user/profile?error=Nur eine Datei erlaubt');
    }
  }
  
  if (error.message === 'Nur JPEG, PNG und WebP Dateien sind erlaubt') {
    return res.redirect('/user/profile?error=' + encodeURIComponent(error.message));
  }
  
  if (error.message === 'Fehler beim Verarbeiten des Bildes') {
    return res.redirect('/user/profile?error=Fehler beim Verarbeiten des Bildes');
  }
  
  next(error);
};

module.exports = {
  upload,
  processProfileImage,
  handleUploadError
};