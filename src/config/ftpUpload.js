const ftp = require("basic-ftp");
const { Readable } = require("stream");

/**
 * Uploads a file buffer to SiteGround via FTP.
 * @param {Buffer} fileBuffer - The file data
 * @param {string} originalName - Original filename (used for extension)
 * @param {"ebooks" | "audio"} folder - Target subfolder inside /uploads/
 * @returns {Promise<string>} The public URL of the uploaded file
 */
const uploadToSiteGround = async (fileBuffer, originalName, folder = "ebooks") => {
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        // Connect to SiteGround FTP
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            port: parseInt(process.env.FTP_PORT) || 21,
            secure: true,
            secureOptions: { rejectUnauthorized: false },
        });

        // Generate unique filename: timestamp-sanitizedOriginalName
        const sanitized = originalName
            .replace(/[^a-zA-Z0-9._-]/g, "_")
            .toLowerCase();
        const uniqueName = `${Date.now()}-${sanitized}`;

        // Navigate to the target directory (FTP root is server root, domain folder is asifemaan.com)
        const remotePath = `/asifemaan.com/public_html/uploads/${folder}`;
        await client.ensureDir(remotePath);

        // Upload the file from buffer
        const readableStream = Readable.from(fileBuffer);
        await client.uploadFrom(readableStream, `${remotePath}/${uniqueName}`);

        // Build and return the public URL
        const baseUrl = process.env.SITE_BASE_URL || "https://asifemaan.com";
        const publicUrl = `${baseUrl}/uploads/${folder}/${uniqueName}`;

        console.log(`✅ FTP Upload Success: ${publicUrl}`);
        return publicUrl;
    } catch (error) {
        console.error("❌ FTP Upload Failed:", error.message);
        throw new Error(`FTP upload failed: ${error.message}`);
    } finally {
        client.close();
    }
};

/**
 * Deletes a file from SiteGround via FTP.
 * @param {string} publicUrl - The full public URL of the file to delete
 */
const deleteFromSiteGround = async (publicUrl) => {
    if (!publicUrl || !publicUrl.includes("/uploads/")) return;

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
        await client.access({
            host: process.env.FTP_HOST,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
            port: parseInt(process.env.FTP_PORT) || 21,
            secure: true,
            secureOptions: { rejectUnauthorized: false },
        });

        // Extract the remote path from the URL
        const urlPath = new URL(publicUrl).pathname; // e.g. /uploads/ebooks/filename.pdf
        const remotePath = `/asifemaan.com/public_html${urlPath}`;

        await client.remove(remotePath);
        console.log(`🗑️ FTP Delete Success: ${remotePath}`);
    } catch (error) {
        // Don't throw on delete failure — log and continue
        console.error("⚠️ FTP Delete Failed (non-critical):", error.message);
    } finally {
        client.close();
    }
};

module.exports = { uploadToSiteGround, deleteFromSiteGround };
