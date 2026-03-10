const pool = require("../config/db");

const getAllPoets = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM Poet ORDER BY realName ASC"
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

const getPoetById = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM Poet WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Poet not found." });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

const createPoet = async (req, res, next) => {
    try {
        const { realName, penName, dateOfBirth, placeOfBirth, profilePicture, bio } = req.body;

        const [result] = await pool.execute(
            `INSERT INTO Poet (realName, penName, dateOfBirth, placeOfBirth, profilePicture, bio)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [realName, penName || null, dateOfBirth || null, placeOfBirth || null, profilePicture || null, bio || null]
        );

        const [newPoet] = await pool.execute("SELECT * FROM Poet WHERE id = ?", [result.insertId]);

        res.status(201).json({
            success: true,
            message: "Poet created successfully.",
            data: newPoet[0],
        });
    } catch (error) {
        next(error);
    }
};

const updatePoet = async (req, res, next) => {
    try {
        const { realName, penName, dateOfBirth, placeOfBirth, profilePicture, bio } = req.body;

        // Check exists
        const [existing] = await pool.execute("SELECT id FROM Poet WHERE id = ?", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Poet not found." });
        }

        await pool.execute(
            `UPDATE Poet SET realName = ?, penName = ?, dateOfBirth = ?, placeOfBirth = ?, profilePicture = ?, bio = ?
             WHERE id = ?`,
            [realName, penName || null, dateOfBirth || null, placeOfBirth || null, profilePicture || null, bio || null, req.params.id]
        );

        const [updated] = await pool.execute("SELECT * FROM Poet WHERE id = ?", [req.params.id]);

        res.json({
            success: true,
            message: "Poet updated successfully.",
            data: updated[0],
        });
    } catch (error) {
        next(error);
    }
};

const deletePoet = async (req, res, next) => {
    try {
        const [existing] = await pool.execute("SELECT id FROM Poet WHERE id = ?", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Poet not found." });
        }

        await pool.execute("DELETE FROM Poet WHERE id = ?", [req.params.id]);

        res.json({ success: true, message: "Poet deleted successfully." });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllPoets,
    getPoetById,
    createPoet,
    updatePoet,
    deletePoet,
};
