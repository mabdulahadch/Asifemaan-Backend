const express = require("express");
const multer = require("multer");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const contentController = require("../controllers/contentController");

const router = express.Router();

// Multer config: store files in memory buffer (for FTP upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max for files
        fieldSize: 50 * 1024 * 1024 // 50MB max for text fields (like base64 JSON)
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype === "application/pdf" ||
            file.mimetype.startsWith("audio/") ||
            file.mimetype.startsWith("image/")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only PDF, audio, and image files are allowed."), false);
        }
    },
});

// Accept pdfFile, audioFile and coverImage fields
const uploadFields = upload.fields([
    { name: "pdfFile", maxCount: 1 },
    { name: "audioFile", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
    { name: "mediaFiles", maxCount: 10 }
]);

router.get("/featured", contentController.getFeaturedContent);
router.get("/poet/:poetId", contentController.getContentByPoet);
router.get("/:id", contentController.getContentById);
router.post("/", auth, adminAuth, uploadFields, contentController.createContent);
router.put("/:id", auth, adminAuth, uploadFields, contentController.updateContent);
router.delete("/:id", auth, adminAuth, contentController.deleteContent);

module.exports = router;
