const pool = require("../config/db");

// ─── CONTENT FAVOURITES ─────────────────────────────────────

/**
 * POST /api/favourites/content/:contentId
 */
const addFavContent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { contentId } = req.params;

        await pool.execute(
            "INSERT IGNORE INTO Favourite_Content (userId, contentId) VALUES (?, ?)",
            [userId, contentId]
        );

        res.status(201).json({
            success: true,
            message: "Added to favourites.",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/favourites/content/:contentId
 */
const removeFavContent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { contentId } = req.params;

        await pool.execute(
            "DELETE FROM Favourite_Content WHERE userId = ? AND contentId = ?",
            [userId, contentId]
        );

        res.status(200).json({
            success: true,
            message: "Removed from favourites.",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/favourites/content
 * Returns full content objects with poet info
 */
const getFavContents = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT c.*, p.realName AS poetName, p.penName AS poetPenName, p.profilePicture AS poetImage
             FROM Favourite_Content fc
             JOIN Content c ON fc.contentId = c.id
             JOIN Poet p ON c.poetId = p.id
             WHERE fc.userId = ?
             ORDER BY fc.createdAt DESC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/favourites/content/ids
 * Returns just an array of content IDs the user has favourited
 */
const getFavContentIds = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            "SELECT contentId FROM Favourite_Content WHERE userId = ?",
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows.map((r) => r.contentId),
        });
    } catch (error) {
        next(error);
    }
};

// ─── POET FAVOURITES (FOLLOW) ───────────────────────────────

/**
 * POST /api/favourites/poet/:poetId
 */
const followPoet = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { poetId } = req.params;

        await pool.execute(
            "INSERT IGNORE INTO Favourite_Poet (userId, poetId) VALUES (?, ?)",
            [userId, poetId]
        );

        res.status(201).json({
            success: true,
            message: "Poet followed.",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * DELETE /api/favourites/poet/:poetId
 */
const unfollowPoet = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { poetId } = req.params;

        await pool.execute(
            "DELETE FROM Favourite_Poet WHERE userId = ? AND poetId = ?",
            [userId, poetId]
        );

        res.status(200).json({
            success: true,
            message: "Poet unfollowed.",
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/favourites/poets
 * Returns full poet objects
 */
const getFollowedPoets = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            `SELECT p.*
             FROM Favourite_Poet fp
             JOIN Poet p ON fp.poetId = p.id
             WHERE fp.userId = ?
             ORDER BY fp.createdAt DESC`,
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/favourites/poets/ids
 * Returns just an array of poet IDs the user follows
 */
const getFollowedPoetIds = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.execute(
            "SELECT poetId FROM Favourite_Poet WHERE userId = ?",
            [userId]
        );

        res.status(200).json({
            success: true,
            data: rows.map((r) => r.poetId),
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addFavContent,
    removeFavContent,
    getFavContents,
    getFavContentIds,
    followPoet,
    unfollowPoet,
    getFollowedPoets,
    getFollowedPoetIds,
};
