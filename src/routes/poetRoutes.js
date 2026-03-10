const express = require("express");
const auth = require("../middleware/auth");
const adminAuth = require("../middleware/adminAuth");
const poetController = require("../controllers/poetController");

const router = express.Router();

router.get("/", poetController.getAllPoets);
router.get("/:id", poetController.getPoetById);
router.post("/", auth, adminAuth, poetController.createPoet);
router.put("/:id", auth, adminAuth, poetController.updatePoet);
router.delete("/:id", auth, adminAuth, poetController.deletePoet);

module.exports = router;