const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const SALT_ROUNDS = 10;

const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

const register = async (req, res, next) => {
    try {
        const { name, email, password, country } = req.body;

        const [existing] = await pool.execute(
            "SELECT id FROM User WHERE email = ?",
            [email]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: "User with this email already exists.",
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Insert user
        const [result] = await pool.execute(
            `INSERT INTO User (name, email, password, country, role, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 'USER', NOW(), NOW())`,
            [name, email, hashedPassword, country]
        );

        // Fetch created user
        const [userRows] = await pool.execute(
            "SELECT id, name, email, country, role, createdAt FROM User WHERE id = ?",
            [result.insertId]
        );

        const user = userRows[0];
        const token = generateToken(user.id);

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const [rows] = await pool.execute(
            "SELECT * FROM User WHERE email = ?",
            [email]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        // Generate token
        const token = generateToken(user.id);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;

        res.status(200).json({
            success: true,
            message: "Login successful.",
            data: { user: userWithoutPassword, token },
        });
    } catch (error) {
        next(error);
    }
};

const getProfile = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT id, name, email, country, role, createdAt, updatedAt FROM User WHERE id = ?",
            [req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        res.status(200).json({
            success: true,
            data: rows[0],
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    getProfile,
};
