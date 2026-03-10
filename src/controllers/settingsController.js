const pool = require("../config/db");
const { uploadToSiteGround, deleteFromSiteGround } = require("../config/ftpUpload");

const getSettings = async (req, res, next) => {
    try {
        const [rows] = await pool.execute("SELECT * FROM SiteSettings WHERE id = 1");
        if (rows.length === 0) {
            return res.json({ success: true, data: {} });
        }
        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

const updateSettings = async (req, res, next) => {
    try {
        const { youtubeUrl, facebookUrl, instagramUrl, linkedinUrl, twitterUrl, existingBanners } = req.body;

        const [existing] = await pool.execute("SELECT * FROM SiteSettings WHERE id = 1");
        let oldRecord = existing[0] || {};

        let finalBanners = [];
        if (existingBanners) {
            try {
                const parsed = JSON.parse(existingBanners);
                if (Array.isArray(parsed)) finalBanners = [...parsed];
            } catch (e) {
                // Ignore parse error
            }
        }

        // Upload any new banners
        if (req.files?.banners) {
            const uploadPromises = req.files.banners.map(file =>
                uploadToSiteGround(file.buffer, file.originalname, "banners")
            );
            const newUrls = await Promise.all(uploadPromises);
            finalBanners = [...finalBanners, ...newUrls];
        }

        // Cleanup removed banners
        if (oldRecord.banners) {
            try {
                const oldFiles = JSON.parse(oldRecord.banners);
                if (Array.isArray(oldFiles)) {
                    oldFiles.forEach(url => {
                        if (!finalBanners.includes(url)) {
                            deleteFromSiteGround(url).catch(() => { });
                        }
                    });
                }
            } catch (e) {
                // Ignore
            }
        }

        const bannersJson = finalBanners.length > 0 ? JSON.stringify(finalBanners) : null;

        if (existing.length === 0) {
            await pool.execute(
                `INSERT INTO SiteSettings (id, youtubeUrl, facebookUrl, instagramUrl, linkedinUrl, twitterUrl, banners) VALUES (1, ?, ?, ?, ?, ?, ?)`,
                [youtubeUrl || null, facebookUrl || null, instagramUrl || null, linkedinUrl || null, twitterUrl || null, bannersJson]
            );
        } else {
            await pool.execute(
                `UPDATE SiteSettings SET youtubeUrl = ?, facebookUrl = ?, instagramUrl = ?, linkedinUrl = ?, twitterUrl = ?, banners = ? WHERE id = 1`,
                [youtubeUrl || null, facebookUrl || null, instagramUrl || null, linkedinUrl || null, twitterUrl || null, bannersJson]
            );
        }

        const [updated] = await pool.execute("SELECT * FROM SiteSettings WHERE id = 1");

        res.json({
            success: true,
            message: "Settings updated successfully",
            data: updated[0],
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSettings,
    updateSettings,
};
