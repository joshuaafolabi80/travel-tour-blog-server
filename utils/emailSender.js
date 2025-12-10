// travel-tour-blog-server/utils/emailSender.js
const nodemailer = require('nodemailer');

// Create transporter with your Gmail credentials
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'joshuaafolabi80@gmail.com', // Your Gmail
        pass: 'awuq ruvp jlko mjes' // Gmail App Password
    }
});

// 1. Send to ADMIN (you)
exports.sendContactForm = async (formData) => {
    try {
        const mailOptions = {
            from: 'The Conclave Academy <joshuaafolabi80@gmail.com>',
            to: 'joshuaafolabi80@gmail.com', // ADMIN email
            subject: `📝 New Write for Us Submission - ${formData.firstName} ${formData.lastName}`,
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
        
        // Send email to ADMIN
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Admin notification sent to joshuaafolabi80@gmail.com');
        return info;
        
    } catch (error) {
        console.error('❌ Admin email failed:', error);
        throw error;
    }
};

// 2. Send confirmation to USER
exports.sendConfirmationEmail = async (formData) => {
    try {
        const mailOptions = {
            from: 'The Conclave Academy <joshuaafolabi80@gmail.com>',
            to: formData.email, // USER's email
            subject: '✅ Thank You for Your Submission - The Conclave Academy Blog',
            text: `
                Dear ${formData.firstName},
                
                Thank you for submitting your application to write for The Conclave Academy Blog!
                
                We have received your submission and our team will review it within 3-5 business days.
                
                Here's a summary of your submission:
                - Name: ${formData.firstName} ${formData.lastName}
                - Email: ${formData.email}
                - Interests: ${formData.interests.join(', ') || 'Not specified'}
                
                If you have any questions, please reply to this email.
                
                Best regards,
                The Conclave Academy Team
                
                ---
                This is an automated confirmation email. Please do not reply to this message.
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
                        .btn { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>✅ Submission Received!</h1>
                            <p>The Conclave Academy Blog</p>
                        </div>
                        <div class="content">
                            <p>Dear <strong>${formData.firstName} ${formData.lastName}</strong>,</p>
                            
                            <p>Thank you for submitting your application to write for <strong>The Conclave Academy Blog</strong>!</p>
                            
                            <div class="section">
                                <h2>📋 Submission Summary</h2>
                                <p><span class="label">Name:</span> ${formData.firstName} ${formData.lastName}</p>
                                <p><span class="label">Email:</span> ${formData.email}</p>
                                <p><span class="label">Phone:</span> ${formData.phone || 'Not provided'}</p>
                                <p><span class="label">Location:</span> ${formData.address || 'Not provided'}</p>
                                <p><span class="label">Interests:</span> ${formData.interests.join(', ') || 'Not specified'}</p>
                            </div>
                            
                            <p>Our team will review your submission within <strong>3-5 business days</strong>. We will contact you via email if we need additional information or to discuss next steps.</p>
                            
                            <p>If you have any questions in the meantime, please feel free to reply to this email.</p>
                            
                            <p style="text-align: center; margin: 30px 0;">
                                <a href="https://the-conclave-academy.netlify.app/blog" class="btn">Visit Our Blog</a>
                            </p>
                            
                            <p>Best regards,<br>
                            <strong>The Conclave Academy Team</strong></p>
                        </div>
                        <div class="footer">
                            <p><em>This is an automated confirmation email. Please do not reply to this message.</em></p>
                            <p>If you have questions, contact: joshuaafolabi80@gmail.com</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };
        
        // Send confirmation to USER
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent to user: ${formData.email}`);
        return info;
        
    } catch (error) {
        console.error('❌ User confirmation email failed:', error);
        throw error;
    }
};

// 3. Test function (optional)
exports.testEmail = async () => {
    try {
        const testData = {
            firstName: 'Test',
            lastName: 'User',
            email: 'joshuaafolabi80@gmail.com',
            phone: '+1234567890',
            address: 'Test City',
            interests: ['Travel Writing', 'Adventure Travel'],
            experience: 'Test experience',
            message: 'Test message',
            hearAboutUs: 'Google Search'
        };
        
        console.log('🧪 Testing email system...');
        await exports.sendContactForm(testData);
        await exports.sendConfirmationEmail(testData);
        console.log('✅ Email test completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Email test failed:', error);
        return false;
    }
};