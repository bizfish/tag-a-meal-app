const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('./auth');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024 // 5MB default
  }
});

// Ensure upload directory exists
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
const recipesDir = path.join(uploadsDir, 'recipes');
const avatarsDir = path.join(uploadsDir, 'avatars');

[uploadsDir, recipesDir, avatarsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Helper function to process and save image
async function processAndSaveImage(buffer, filename, type = 'recipe') {
  try {
    const targetDir = type === 'avatar' ? avatarsDir : recipesDir;
    const filepath = path.join(targetDir, filename);
    
    // Process image with sharp
    let processedImage = sharp(buffer);
    
    if (type === 'avatar') {
      // For avatars: resize to 200x200, crop to square
      processedImage = processedImage
        .resize(200, 200, { 
          fit: 'cover',
          position: 'center'
        });
    } else {
      // For recipe images: resize to max 800x600, maintain aspect ratio
      processedImage = processedImage
        .resize(800, 600, { 
          fit: 'inside',
          withoutEnlargement: true
        });
    }
    
    // Convert to JPEG with quality optimization
    await processedImage
      .jpeg({ 
        quality: 85,
        progressive: true
      })
      .toFile(filepath);
    
    return filename;
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
}

// Upload recipe image
router.post('/recipe-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Generate unique filename
    const fileExtension = '.jpg'; // Always save as JPEG
    const filename = `recipe_${uuidv4()}${fileExtension}`;
    
    // Process and save image
    await processAndSaveImage(req.file.buffer, filename, 'recipe');
    
    // Return the URL path
    const imageUrl = `/uploads/recipes/${filename}`;
    
    res.json({
      message: 'Recipe image uploaded successfully',
      imageUrl: imageUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Error uploading recipe image:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        message: 'Image file size exceeds the maximum allowed limit'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload image',
      message: error.message 
    });
  }
});

// Upload avatar image
router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No avatar file provided' });
    }

    // Generate unique filename
    const fileExtension = '.jpg'; // Always save as JPEG
    const filename = `avatar_${req.user.id}_${Date.now()}${fileExtension}`;
    
    // Process and save image
    await processAndSaveImage(req.file.buffer, filename, 'avatar');
    
    // Return the URL path
    const avatarUrl = `/uploads/avatars/${filename}`;
    
    // Update user's avatar in database
    const { createClient } = require('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: req.headers.authorization
          }
        }
      }
    );

    const { error: updateError } = await userSupabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Error updating avatar in database:', updateError);
      // Still return success since file was uploaded
    }
    
    res.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl,
      filename: filename
    });

  } catch (error) {
    console.error('Error uploading avatar:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        error: 'File too large',
        message: 'Avatar file size exceeds the maximum allowed limit'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload avatar',
      message: error.message 
    });
  }
});

// Upload multiple recipe images
router.post('/recipe-images', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided' });
    }

    const uploadedImages = [];
    const errors = [];

    for (let i = 0; i < req.files.length; i++) {
      try {
        const file = req.files[i];
        const fileExtension = '.jpg';
        const filename = `recipe_${uuidv4()}${fileExtension}`;
        
        await processAndSaveImage(file.buffer, filename, 'recipe');
        
        uploadedImages.push({
          originalName: file.originalname,
          filename: filename,
          imageUrl: `/uploads/recipes/${filename}`
        });
      } catch (error) {
        errors.push({
          file: req.files[i].originalname,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Image upload completed',
      uploadedImages,
      errors: errors.length > 0 ? errors : undefined,
      totalUploaded: uploadedImages.length,
      totalErrors: errors.length
    });

  } catch (error) {
    console.error('Error uploading multiple images:', error);
    res.status(500).json({ 
      error: 'Failed to upload images',
      message: error.message 
    });
  }
});

// Delete uploaded image
router.delete('/image/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check both recipe and avatar directories
    const recipePath = path.join(recipesDir, filename);
    const avatarPath = path.join(avatarsDir, filename);
    
    let filePath = null;
    if (fs.existsSync(recipePath)) {
      filePath = recipePath;
    } else if (fs.existsSync(avatarPath)) {
      filePath = avatarPath;
    }
    
    if (!filePath) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // For avatars, check if user owns the file
    if (filePath === avatarPath && !filename.includes(req.user.id)) {
      return res.status(403).json({ error: 'Not authorized to delete this image' });
    }

    // Delete the file
    fs.unlinkSync(filePath);
    
    res.json({ message: 'Image deleted successfully' });

  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ 
      error: 'Failed to delete image',
      message: error.message 
    });
  }
});

// Get image info
router.get('/image/:filename/info', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check both directories
    const recipePath = path.join(recipesDir, filename);
    const avatarPath = path.join(avatarsDir, filename);
    
    let filePath = null;
    let type = null;
    
    if (fs.existsSync(recipePath)) {
      filePath = recipePath;
      type = 'recipe';
    } else if (fs.existsSync(avatarPath)) {
      filePath = avatarPath;
      type = 'avatar';
    }
    
    if (!filePath) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    
    // Get image metadata
    const metadata = await sharp(filePath).metadata();
    
    res.json({
      filename,
      type,
      size: stats.size,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      created: stats.birthtime,
      modified: stats.mtime
    });

  } catch (error) {
    console.error('Error getting image info:', error);
    res.status(500).json({ 
      error: 'Failed to get image info',
      message: error.message 
    });
  }
});

// Resize existing image
router.post('/image/:filename/resize', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const { width, height, quality = 85 } = req.body;
    
    // Security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Validation
    if (!width || !height || width < 1 || height < 1 || width > 2000 || height > 2000) {
      return res.status(400).json({ 
        error: 'Invalid dimensions',
        message: 'Width and height must be between 1 and 2000 pixels'
      });
    }

    if (quality < 1 || quality > 100) {
      return res.status(400).json({ 
        error: 'Invalid quality',
        message: 'Quality must be between 1 and 100'
      });
    }

    // Find the file
    const recipePath = path.join(recipesDir, filename);
    const avatarPath = path.join(avatarsDir, filename);
    
    let sourcePath = null;
    let targetDir = null;
    
    if (fs.existsSync(recipePath)) {
      sourcePath = recipePath;
      targetDir = recipesDir;
    } else if (fs.existsSync(avatarPath)) {
      sourcePath = avatarPath;
      targetDir = avatarsDir;
      
      // Check if user owns the avatar
      if (!filename.includes(req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to resize this image' });
      }
    }
    
    if (!sourcePath) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Generate new filename
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const newFilename = `${baseName}_${width}x${height}${ext}`;
    const targetPath = path.join(targetDir, newFilename);

    // Resize image
    await sharp(sourcePath)
      .resize(parseInt(width), parseInt(height), {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: parseInt(quality) })
      .toFile(targetPath);

    const imageUrl = targetDir === avatarsDir 
      ? `/uploads/avatars/${newFilename}`
      : `/uploads/recipes/${newFilename}`;

    res.json({
      message: 'Image resized successfully',
      originalFilename: filename,
      newFilename,
      imageUrl,
      dimensions: { width: parseInt(width), height: parseInt(height) },
      quality: parseInt(quality)
    });

  } catch (error) {
    console.error('Error resizing image:', error);
    res.status(500).json({ 
      error: 'Failed to resize image',
      message: error.message 
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds the maximum allowed limit'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Number of files exceeds the maximum allowed limit'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed'
    });
  }
  
  next(error);
});

module.exports = router;
