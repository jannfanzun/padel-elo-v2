const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Send email to admin when new registration request is submitted
const sendRegistrationRequestEmail = async (request) => {
  try {
    const transporter = createTransporter();
    
    // Email content
    const mailOptions = {
      from: `"Padel Ranking" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '🏓 New Registration Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0d6efd;">New Registration Request</h2>
          <p>A new user has requested to join the Padel Ranking system.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Username:</strong> ${request.username}</p>
            <p><strong>Email:</strong> ${request.email}</p>
            <p><strong>Date:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${request.ipAddress || 'N/A'}</p>
          </div>
          
          <p>Please log in to the <a href="${process.env.SITE_URL}/admin/registration-requests" style="color: #0d6efd; text-decoration: none;">admin dashboard</a> to review this request.</p>
          
          <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">This is an automated message from the Padel Ranking system.</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Registration request email sent to admin for user: ${request.username}`);
    
  } catch (error) {
    console.error('Error sending registration request email to admin:', error);
  }
};

// Send email to user when registration is approved
const sendRegistrationApprovedEmail = async (user) => {
  try {
    const transporter = createTransporter();
    
    // Email content
    const mailOptions = {
      from: `"Padel Ranking" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: '🎉 Welcome to Padel Ranking - Registration Approved!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0d6efd;">Registration Approved!</h2>
          <p>Hello ${user.username},</p>
          
          <p>Your registration for the Padel Ranking system has been approved! You can now log in with your credentials.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/auth/login" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Log in Now
            </a>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Username:</strong> ${user.username}</p>
            <p><strong>Initial ELO Rating:</strong> 500</p>
          </div>
          
          <p>We're excited to have you join our Padel community. Start adding games and climb the rankings!</p>
          
          <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">This is an automated message from the Padel Ranking system.</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Registration approved email sent to user: ${user.username}`);
    
  } catch (error) {
    console.error('Error sending registration approved email to user:', error);
  }
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetUrl) => {
    try {
      const transporter = createTransporter();
      
      // Email content
      const mailOptions = {
        from: `"Padel Ranking" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: '🔑 Passwort zurücksetzen - Padel Ranking',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd;">Passwort zurücksetzen</h2>
            <p>Hallo ${user.username},</p>
            
            <p>Du hast eine Anfrage gestellt, um dein Passwort zurückzusetzen. Bitte klicke auf den folgenden Link, um ein neues Passwort zu erstellen:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Passwort zurücksetzen
              </a>
            </div>
            
            <p>Dieser Link ist nur 30 Minuten gültig.</p>
            
            <p>Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren und dein Passwort bleibt unverändert.</p>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatische Nachricht von Padel Ranking.</p>
          </div>
        `
      };
      
      // Send email
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to: ${user.email}`);
      
    } catch (error) {
      console.error('Error sending password reset email:', error);
    }
  };
  
  module.exports = {
    sendRegistrationRequestEmail,
    sendRegistrationApprovedEmail,
    sendPasswordResetEmail
  };