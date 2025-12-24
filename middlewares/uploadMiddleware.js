const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

/* ================================
   Ensure upload folders exist
================================ */
const ensureDir = dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

ensureDir("uploads/profile");
ensureDir("uploads/portfolio");
ensureDir("uploads/license");

/* ================================
   Multer config (memory storage)
================================ */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png"
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(null, false); // ❌ silently reject
      req.fileValidationError =
        "Invalid image format. Allowed formats: JPG, JPEG, PNG.";
    }
  }
});

/* ================================
   Convert image → JPG
================================ */
const convertToJpg = async (req, res, next) => {
  // ❌ Wrong file format
  if (req.fileValidationError) {
    return res.status(400).json({
      success: false,
      message: req.fileValidationError
    });
  }

  try {
    if (!req.files && !req.file) return next();

    const files = [];

    if (req.file) files.push(req.file);
    if (req.files) {
      Object.values(req.files).forEach(arr => files.push(...arr));
    }

    for (const file of files) {
      let folder = "uploads";

      if (file.fieldname === "profileImage") folder = "uploads/profile";
      if (file.fieldname === "portfolioPhotos") folder = "uploads/portfolio";
      if (file.fieldname === "licenseDocument") folder = "uploads/license";

      const filename = `${file.fieldname}-${Date.now()}.jpg`;
      const filepath = path.join(folder, filename);

      await sharp(file.buffer)
        .jpeg({ quality: 90 })
        .toFile(filepath);

      // 🔥 overwrite filename so controller unchanged rahe
      file.filename = filename;
    }

    next();
  } catch (error) {
    console.error("Image processing error:", error);
    return res.status(400).json({
      success: false,
      message: "Invalid image file"
    });
  }
};

module.exports = {
  upload,
  convertToJpg
};
