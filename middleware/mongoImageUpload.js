const multer = require('multer');
const sharp = require('sharp');

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
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  }
}).single('profileImage');

// Profile image processing middleware - speichert direkt in MongoDB als Base64
const processProfileImageMongo = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    console.log('🖼️ Processing image for MongoDB storage...');
    
    // Process and compress image with Sharp
    const processedBuffer = await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: 'cover',
        position: 'center'
      })
      .webp({
        quality: 80,
        effort: 6
      })
      .toBuffer();

    // Convert to Base64 data URL für direktes speichern in MongoDB
    const base64Image = `data:image/webp;base64,${processedBuffer.toString('base64')}`;
    
    // Add processed image data to request
    req.processedImage = {
      path: base64Image  // Das ist jetzt der komplette Base64 String!
    };

    console.log(`✅ Image processed for MongoDB: ${Math.round(processedBuffer.length / 1024)}KB`);
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
  processProfileImageMongo,
  handleUploadError
};