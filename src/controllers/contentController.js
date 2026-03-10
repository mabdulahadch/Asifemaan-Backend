const pool = require("../config/db");
const { uploadToSiteGround, deleteFromSiteGround } = require("../config/ftpUpload");

const getFeaturedContent = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            `SELECT c.*, p.penName, p.realName 
             FROM Content c 
             JOIN Poet p ON c.poetId = p.id 
             WHERE c.isFeatured = 1 
             ORDER BY c.createdAt DESC 
             LIMIT 20`
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

const getContentByPoet = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM Content WHERE poetId = ? ORDER BY type ASC, title ASC",
            [req.params.poetId]
        );
        res.json({ success: true, data: rows });
    } catch (error) {
        next(error);
    }
};

const getContentById = async (req, res, next) => {
    try {
        const [rows] = await pool.execute(
            "SELECT * FROM Content WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Content not found." });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        next(error);
    }
};

const createContent = async (req, res, next) => {
    try {
        const { poetId, title, type, textContent, youtubeLink, isFeatured } = req.body;

        // Verify poet exists
        const [poet] = await pool.execute("SELECT id FROM Poet WHERE id = ?", [poetId]);
        if (poet.length === 0) {
            return res.status(404).json({ success: false, message: "Poet not found." });
        }

        // Handle PDF file upload to SiteGround
        let pdfFileUrl = null;
        const pdfFile = req.files?.pdfFile?.[0];
        if (pdfFile && type === "EBOOK") {
            pdfFileUrl = await uploadToSiteGround(pdfFile.buffer, pdfFile.originalname, "ebooks");
        }

        // Handle Audio file upload to SiteGround
        let audioFileUrl = null;
        const audioFile = req.files?.audioFile?.[0];
        if (audioFile && type === "AUDIO") {
            audioFileUrl = await uploadToSiteGround(audioFile.buffer, audioFile.originalname, "audio");
        }

        // Handle Cover Image upload to SiteGround
        let coverImageUrl = null;
        const coverImage = req.files?.coverImage?.[0];
        if (coverImage) {
            coverImageUrl = await uploadToSiteGround(coverImage.buffer, coverImage.originalname, "covers");
        }

        // Handle Sher Media Files
        let mediaFilesUrls = [];
        if (req.files?.mediaFiles && type === "SHER") {
            const uploadPromises = req.files.mediaFiles.map(file =>
                uploadToSiteGround(file.buffer, file.originalname, "sher_media")
            );
            mediaFilesUrls = await Promise.all(uploadPromises);
        }

        const [result] = await pool.execute(
            `INSERT INTO Content (poetId, title, type, textContent, pdfFile, youtubeLink, audioFile, coverImage, isFeatured, mediaFiles)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                poetId,
                title,
                type,
                textContent || null,
                pdfFileUrl,
                youtubeLink || null,
                audioFileUrl,
                coverImageUrl,
                isFeatured === "1" ? 1 : 0,
                mediaFilesUrls.length > 0 ? JSON.stringify(mediaFilesUrls) : null,
            ]
        );

        const [newContent] = await pool.execute("SELECT * FROM Content WHERE id = ?", [result.insertId]);

        res.status(201).json({
            success: true,
            message: "Content created successfully.",
            data: newContent[0],
        });
    } catch (error) {
        next(error);
    }
};

const updateContent = async (req, res, next) => {
    try {
        const { title, type, textContent, youtubeLink, isFeatured, existingMediaFiles } = req.body;

        const [existing] = await pool.execute("SELECT * FROM Content WHERE id = ?", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Content not found." });
        }

        const oldRecord = existing[0];
        const updates = [];
        const params = [];

        // --- Handle Fields ---
        if (title !== undefined) {
            updates.push("title = ?");
            params.push(title);
        }
        if (type !== undefined) {
            updates.push("type = ?");
            params.push(type);
        }
        if (textContent !== undefined) {
            updates.push("textContent = ?");
            params.push(textContent || null);
        }
        if (youtubeLink !== undefined) {
            updates.push("youtubeLink = ?");
            params.push(youtubeLink || null);
        }
        if (isFeatured !== undefined) {
            updates.push("isFeatured = ?");
            params.push(isFeatured === "1" ? 1 : 0);
        }

        // --- Handle Files ---
        // PDF
        const pdfFile = req.files?.pdfFile?.[0];
        if (pdfFile) {
            const pdfFileUrl = await uploadToSiteGround(pdfFile.buffer, pdfFile.originalname, "ebooks");
            updates.push("pdfFile = ?");
            params.push(pdfFileUrl);
            if (oldRecord.pdfFile) {
                deleteFromSiteGround(oldRecord.pdfFile).catch(() => { });
            }
        } else if (type !== undefined && type !== "EBOOK" && oldRecord.pdfFile) {
            // If type changed from EBOOK to something else, clear PDF
            updates.push("pdfFile = ?");
            params.push(null);
            deleteFromSiteGround(oldRecord.pdfFile).catch(() => { });
        }

        // Audio
        const audioFile = req.files?.audioFile?.[0];
        if (audioFile) {
            const audioFileUrl = await uploadToSiteGround(audioFile.buffer, audioFile.originalname, "audio");
            updates.push("audioFile = ?");
            params.push(audioFileUrl);
            if (oldRecord.audioFile) {
                deleteFromSiteGround(oldRecord.audioFile).catch(() => { });
            }
        } else if (type !== undefined && type !== "AUDIO" && oldRecord.audioFile) {
            // If type changed from AUDIO to something else, clear Audio
            updates.push("audioFile = ?");
            params.push(null);
            deleteFromSiteGround(oldRecord.audioFile).catch(() => { });
        }

        // Cover Image
        const coverImage = req.files?.coverImage?.[0];
        if (coverImage) {
            const coverImageUrl = await uploadToSiteGround(coverImage.buffer, coverImage.originalname, "covers");
            updates.push("coverImage = ?");
            params.push(coverImageUrl);
            if (oldRecord.coverImage) {
                deleteFromSiteGround(oldRecord.coverImage).catch(() => { });
            }
        }

        // Handle Media Files Update (for Sher)
        // We will combine any leftover existing strings with new uploads
        if (oldRecord.type === "SHER" || type === "SHER") {
            let finalMediaFiles = [];
            // Parse existing kept media files
            if (existingMediaFiles) {
                try {
                    const parsed = JSON.parse(existingMediaFiles);
                    if (Array.isArray(parsed)) {
                        finalMediaFiles = [...parsed];
                    }
                } catch (e) {
                    // Ignore parse error
                }
            }

            // Upload any new mediaFiles
            if (req.files?.mediaFiles) {
                const uploadPromises = req.files.mediaFiles.map(file =>
                    uploadToSiteGround(file.buffer, file.originalname, "sher_media")
                );
                const newUrls = await Promise.all(uploadPromises);
                finalMediaFiles = [...finalMediaFiles, ...newUrls];
            }

            updates.push("mediaFiles = ?");
            params.push(finalMediaFiles.length > 0 ? JSON.stringify(finalMediaFiles) : null);

            // Cleanup removed files
            if (oldRecord.mediaFiles) {
                try {
                    const oldFiles = JSON.parse(oldRecord.mediaFiles);
                    if (Array.isArray(oldFiles)) {
                        oldFiles.forEach(url => {
                            if (!finalMediaFiles.includes(url)) {
                                deleteFromSiteGround(url).catch(() => { });
                            }
                        });
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }

        if (updates.length > 0) {
            params.push(req.params.id);
            await pool.execute(
                `UPDATE Content SET ${updates.join(", ")} WHERE id = ?`,
                params
            );
        }

        const [updated] = await pool.execute("SELECT * FROM Content WHERE id = ?", [req.params.id]);

        res.json({
            success: true,
            message: "Content updated successfully.",
            data: updated[0],
        });
    } catch (error) {
        next(error);
    }
};

const deleteContent = async (req, res, next) => {
    try {
        const [existing] = await pool.execute("SELECT * FROM Content WHERE id = ?", [req.params.id]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: "Content not found." });
        }

        // Delete associated files from SiteGround
        const record = existing[0];
        if (record.pdfFile) {
            deleteFromSiteGround(record.pdfFile).catch(() => { });
        }
        if (record.audioFile && record.audioFile.startsWith("http")) {
            deleteFromSiteGround(record.audioFile).catch(() => { });
        }
        if (record.coverImage) {
            deleteFromSiteGround(record.coverImage).catch(() => { });
        }
        if (record.mediaFiles) {
            try {
                const mediaFiles = JSON.parse(record.mediaFiles);
                if (Array.isArray(mediaFiles)) {
                    mediaFiles.forEach(url => deleteFromSiteGround(url).catch(() => { }));
                }
            } catch (e) { }
        }

        await pool.execute("DELETE FROM Content WHERE id = ?", [req.params.id]);

        res.json({ success: true, message: "Content deleted successfully." });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getFeaturedContent,
    getContentByPoet,
    getContentById,
    createContent,
    updateContent,
    deleteContent,
};