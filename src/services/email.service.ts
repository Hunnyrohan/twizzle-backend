import nodemailer from 'nodemailer';

class EmailService {
    private transporter;

    constructor() {
        // For development, we can use Ethereal or Mailtrap
        // If SMTP credentials aren't provided in .env, it uses a mock/console logger
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendResetPasswordEmail(to: string, code: string) {
        const mailOptions = {
            from: '"Twizzle Support" <support@twizzle.com>',
            to,
            subject: 'Password Reset Code - Twizzle',
            text: `Your password reset code is: ${code}. It will expire in 1 hour.`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e1e8ed; border-radius: 12px;">
          <h2 style="color: #1da1f2;">Reset your Twizzle password</h2>
          <p>We received a request to reset your password. Use the following code to complete the process:</p>
          <div style="background-color: #f5f8fa; padding: 15px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1da1f2; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 20px 0;">
          <p style="font-size: 12px; color: #657786;">Twizzle, Inc. 1355 Market St, Suite 900, San Francisco, CA 94103</p>
        </div>
      `,
        };

        try {
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.log('--- EMAIL MOCK ---');
                console.log(`To: ${to}`);
                console.log(`Subject: ${mailOptions.subject}`);
                console.log(`Code: ${code}`);
                console.log('--- END MOCK ---');
                return;
            }

            const info = await this.transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send reset email');
        }
    }
}

export default new EmailService();
