const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const settingsController = require("../controllers/settingsController");

const router = express.Router();

// Multer config: store files in memory buffer (for FTP upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max for files
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed."), false);
        }
    },
});

router.get("/", settingsController.getSettings);
router.put("/", auth, adminAuth, upload.fields([{ name: "banners", maxCount: 10 }, { name: "logo", maxCount: 1 }]), settingsController.updateSettings);

module.exports = router;
