const multer = require('multer');
const path = require('path');
const fs = require('fs');

const projectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const uploadPath = path.join(__dirname, '../../..', 'uploads/projects', userId);
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `sketch-${uniqueSuffix}${ext}`);
  }
});

const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed'), false);
  }
};

const uploadSketch = multer({
  storage: projectStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: imageFilter
});

const urlPathToAbsolute = (urlPath) => {
  const relative = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
  return path.join(__dirname, '../../..', relative);
};

const saveGeneratedImage = async (imageBuffer, userId, projectId, versionId) => {
  const uploadPath = path.join(__dirname, '../../..', 'uploads/generated', userId, projectId);
  fs.mkdirSync(uploadPath, { recursive: true });

  const filename = `${versionId}.png`;
  const filePath = path.join(uploadPath, filename);

  fs.writeFileSync(filePath, imageBuffer);

  return `/uploads/generated/${userId}/${projectId}/${filename}`;
};

const deleteProjectFiles = async (userId, projectId, originalImageUrl) => {
  try {
    // Delete the original sketch file (flat in uploads/projects/{userId}/)
    if (originalImageUrl) {
      const sketchPath = urlPathToAbsolute(originalImageUrl);
      if (fs.existsSync(sketchPath)) {
        fs.unlinkSync(sketchPath);
      }
    }

    // Delete the generated images directory (uploads/generated/{userId}/{projectId}/)
    const generatedPath = path.join(__dirname, '../../..', 'uploads/generated', userId, projectId);
    if (fs.existsSync(generatedPath)) {
      fs.rmSync(generatedPath, { recursive: true });
    }
  } catch (error) {
    console.error('Error deleting project files:', error);
  }
};

module.exports = {
  uploadSketch,
  saveGeneratedImage,
  deleteProjectFiles,
  urlPathToAbsolute
};
