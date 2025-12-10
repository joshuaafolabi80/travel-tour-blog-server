// travel-tour-blog-server/utils/emailSender.js
const nodemailer = require('nodemailer');

// Create transporter with your Gmail credentials
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'joshuaafolabi80@gmail.com', // Your Gmail
        pass: 'awuq ruvp jlko mjes' // Gmail App Password (see instructions below)
    }
});

exports.sendContactForm = async (formData) => {
    try {
        const mailOptions = {
            from: 'joshuaafolabi80@gmail.com',
            to: 'joshuaafolabi80@gmail.com', // Sends to your email
            subject: `New Write for Us Submission - ${formData.firstName} ${formData.lastName}`,
            text: `
                NEW WRITE FOR US SUBMISSION
                ===========================
                
                👤 PERSONAL DETAILS:
                --------------------
                Name: ${formData.firstName} ${formData.lastName}
                Email: ${formData.email}
                Phone: ${formData.phone || 'Not provided'}
                Location: ${formData.address || 'Not provided'}
                
                🎯 WRITING INTERESTS:
                --------------------
                ${formData.interests.join(', ') || 'Not specified'}
                
                📚 EXPERIENCE:
                -------------
                ${formData.experience || 'Not provided'}
                
                💬 ADDITIONAL MESSAGE:
                ---------------------
                ${formData.message || 'No message'}
                
                📝 HOW THEY HEARD ABOUT US:
                --------------------------
                ${formData.hearAboutUs || 'Not specified'}
                
                ⏰ SUBMITTED:
                ------------
                ${new Date().toLocaleString()}
            `,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                        .content { background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
                        .section { margin-bottom: 20px; padding: 15px; background: white; border-left: 4px solid #4CAF50; }
                        .label { font-weight: bold; color: #4CAF50; }
                        .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>📝 New Write for Us Submission</h1>
                            <p>The Conclave Academy Blog</p>
                        </div>
                        <div class="content">
                            <div class="section">
                                <h2>👤 Personal Details</h2>
                                <p><span class="label">Name:</span> ${formData.firstName} ${formData.lastName}</p>
                                <p><span class="label">Email:</span> ${formData.email}</p>
                                <p><span class="label">Phone:</span> ${formData.phone || 'Not provided'}</p>
                                <p><span class="label">Location:</span> ${formData.address || 'Not provided'}</p>
                            </div>
                            
                            <div class="section">
                                <h2>🎯 Writing Interests</h2>
                                <p>${formData.interests.join(', ') || 'Not specified'}</p>
                            </div>
                            
                            <div class="section">
                                <h2>📚 Experience</h2>
                                <p>${formData.experience || 'Not provided'}</p>
                            </div>
                            
                            <div class="section">
                                <h2>💬 Additional Message</h2>
                                <p>${formData.message || 'No message'}</p>
                            </div>
                            
                            <div class="section">
                                <h2>📝 How They Heard About Us</h2>
                                <p>${formData.hearAboutUs || 'Not specified'}</p>
                            </div>
                            
                            <div class="footer">
                                <p><em>Submitted: ${new Date().toLocaleString()}</em></p>
                                <p>This email was sent from The Conclave Academy Blog contact form.</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return info;
        
    } catch (error) {
        console.error('❌ Email sending failed:', error);
        throw error;
    }
};