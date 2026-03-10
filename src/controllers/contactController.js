const nodemailer = require("nodemailer");

const sendContactEmail = async (req, res, next) => {
    try {
        const { name, email, country, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ success: false, message: "Name, email, and message are required." });
        }

        // Configure Nodemailer transporter
        // Use SMTP credentials from environment variable for security
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "mail.asifemaan.com",
            port: process.env.SMTP_PORT || 465,
            secure: true, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        // Email Content
        const mailOptions = {
            from: `"Asifemaan Contact" <${process.env.SMTP_USER}>`, // sender address
            to: process.env.RECEIVER_EMAIL, // receiver (your email)
            replyTo: email,
            subject: `New Contact Submission from ${name}`,
            html: `
                <h2>New Contact Form Submission</h2>
                <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Name</th>
                        <td style="border: 1px solid #ddd; padding: 8px;">${name}</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Email</th>
                        <td style="border: 1px solid #ddd; padding: 8px;">${email}</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Country</th>
                        <td style="border: 1px solid #ddd; padding: 8px;">${country || "N/A"}</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f2f2f2;">Message</th>
                        <td style="border: 1px solid #ddd; padding: 8px; white-space: pre-wrap;">${message}</td>
                    </tr>
                </table>
            `,
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        res.json({
            success: true,
            message: "Your message has been sent successfully.",
        });
    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ success: false, message: "Failed to send message. Please try again later.", error: error.message });
        next(error);
    }
};

module.exports = {
    sendContactEmail,
};
