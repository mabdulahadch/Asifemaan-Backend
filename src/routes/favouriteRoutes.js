const express = require("express");
const auth = require("../middleware/auth");
const fc = require("../controllers/favouriteController");

const router = express.Router();

// All favourite routes require authentication
router.use(auth);

// ─── Content favourites ─────────────────────────────
router.get("/content", fc.getFavContents);
router.get("/content/ids", fc.getFavContentIds);
router.post("/content/:contentId", fc.addFavContent);
router.delete("/content/:contentId", fc.removeFavContent);

// ─── Poet follows ───────────────────────────────────
router.get("/poets", fc.getFollowedPoets);
router.get("/poets/ids", fc.getFollowedPoetIds);
router.post("/poet/:poetId", fc.followPoet);
router.delete("/poet/:poetId", fc.unfollowPoet);

module.exports = router;
