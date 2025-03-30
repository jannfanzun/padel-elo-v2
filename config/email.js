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
        subject: '🏓 Neue Registrierungsanfrage',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd;">Neue Registrierungsanfrage</h2>
            <p>Ein neuer Benutzer hat eine Anfrage zur Registrierung im Padel Ranking System gestellt.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Benutzername:</strong> ${request.username}</p>
              <p><strong>E-Mail:</strong> ${request.email}</p>
              <p><strong>Datum:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
              <p><strong>IP-Adresse:</strong> ${request.ipAddress || 'N/A'}</p>
            </div>
            
            <p>Bitte melde dich im <a href="${process.env.SITE_URL}/admin/registration-requests" style="color: #0d6efd; text-decoration: none;">Admin-Dashboard</a> an, um diese Anfrage zu überprüfen.</p>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatisierte Nachricht des Padel Ranking Systems.</p>
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
        subject: '🎉 Willkommen bei Padel Ranking – Registrierung bestätigt!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd;">Registrierung bestätigt!</h2>
            <p>Hallo ${user.username},</p>
            
            <p>Deine Registrierung im Padel Ranking System wurde erfolgreich bestätigt! Du kannst dich jetzt mit deinen Zugangsdaten anmelden.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.SITE_URL}/auth/login" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Jetzt anmelden
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Benutzername:</strong> ${user.username}</p>
              <p><strong>Start-ELO-Wertung:</strong> 500</p>
            </div>
            
            <p>Wir freuen uns, dich in unserer Padel-Community begrüßen zu dürfen. Fange an, Spiele einzutragen und klettere in der Rangliste nach oben!</p>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatisierte Nachricht des Padel Ranking Systems.</p>
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