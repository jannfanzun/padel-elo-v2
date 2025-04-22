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
        from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
        to: process.env.ADMIN_EMAIL,
        subject: '🥎 Neue Registrierungsanfrage',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd;">Neue Registrierungsanfrage</h2>
            <p>Ein neuer Benutzer hat eine Anfrage zur Registrierung im padELO Ranking System gestellt.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Benutzername:</strong> ${request.username}</p>
              <p><strong>E-Mail:</strong> ${request.email}</p>
              <p><strong>Datum:</strong> ${new Date(request.createdAt).toLocaleString()}</p>
            </div>
            
            <p>Bitte melde dich im <a href="${process.env.SITE_URL}/admin/registration-requests" style="color: #0d6efd; text-decoration: none;">Admin-Dashboard</a> an, um diese Anfrage zu überprüfen.</p>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatisierte Nachricht des padELO Ranking Systems.</p>
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
        from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: '🎉 Willkommen bei padELO Ranking – Registrierung bestätigt!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd;">Registrierung bestätigt!</h2>
            <p>Hallo ${user.username},</p>
            
            <p>Deine Registrierung im padELO Ranking System wurde erfolgreich bestätigt! Du kannst dich jetzt mit deinen Zugangsdaten anmelden.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.SITE_URL}/auth/login" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Jetzt anmelden
              </a>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p><strong>Benutzername:</strong> ${user.username}</p>
              <p><strong>Start-ELO-Wertung:</strong> 500</p>
            </div>
            
            <p>Wir freuen uns, dich in unserer Padel-Community begrüssen zu dürfen. Fange an, Spiele einzutragen und klettere in der Rangliste nach oben!</p>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatisierte Nachricht des padELO Ranking Systems.</p>
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
        from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
        to: user.email,
        subject: '🔑 Passwort zurücksetzen - padELO Ranking',
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
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatische Nachricht von padELO Ranking.</p>
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
  
// Send game report email to admin
const sendGameReportEmail = async (user, game, reason, details) => {
  try {
    const transporter = createTransporter();
    const jwt = require('jsonwebtoken');
    
    // Generate a special admin access token valid for 7 days
    const adminAccessToken = jwt.sign(
      { 
        id: process.env.ADMIN_ID, // Admin user ID from environment
        isAdmin: true,
        purpose: 'game-report-access',
        gameId: game._id.toString()
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    // Direct access URL with token
    const directGameUrl = `${process.env.SITE_URL}/game/${game._id}?token=${adminAccessToken}`;
    
    // Map reason code to readable text
    const reasonText = {
      'wrong_score': 'Falsches Ergebnis eingetragen',
      'wrong_players': 'Falsche Spieler eingetragen',
      'duplicate': 'Doppelter Eintrag',
      'other': 'Anderes Problem'
    }[reason] || reason;
    
    // Format game date
    const gameDate = new Date(game.createdAt).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Email content
    const mailOptions = {
      from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `🚨 Problem-Meldung für Spiel #${game._id.toString().substr(-6)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #dc3545;">Problem mit einem Spiel gemeldet</h2>
          
          <p>${user.username} hat ein Problem mit folgendem Spiel gemeldet:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Spiel ID:</strong> ${game._id}</p>
            <p><strong>Datum:</strong> ${gameDate}</p>
            <p><strong>Teams:</strong> ${game.team1[0].player.username} & ${game.team1[1].player.username} vs ${game.team2[0].player.username} & ${game.team2[1].player.username}</p>
            <p><strong>Ergebnis:</strong> ${game.score.team1} - ${game.score.team2}</p>
            <p><strong>Gemeldet von:</strong> ${user.username} (${user.email})</p>
          </div>
          
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p><strong>Grund der Meldung:</strong> ${reasonText}</p>
            <p><strong>Details:</strong> ${details || 'Keine weiteren Details angegeben.'}</p>
          </div>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${directGameUrl}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-bottom: 10px; display: inline-block;">
              <strong>Zum gemeldeten Spiel</strong>
            </a>
          </div>
          
          <div style="margin-top: 15px; text-align: center;">
            <a href="${process.env.SITE_URL}/admin/games" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Zur Spielübersicht
            </a>
          </div>
          
          <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatische Nachricht von padELO Ranking. Der Link zum Spiel ist 7 Tage gültig.</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Game report email sent to admin for game: ${game._id}`);
    
  } catch (error) {
    console.error('Error sending game report email:', error);
  }
};

const sendInactivityPenaltyEmail = async (user, oldElo, newElo) => {
  try {
    const transporter = createTransporter();
    
    // Email content
    const mailOptions = {
      from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject: '⚠️ Inaktivitätsstrafe - padELO Ranking',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #dc3545;">Inaktivitätsstrafe angewendet</h2>
          <p>Hallo ${user.username},</p>
          
          <p>Wir haben festgestellt, dass du in den letzten 7 Tagen keine Spiele in unserem Padel-Ranking-System gespielt hast. Gemäss unseren Regeln wurde eine Inaktivitätsstrafe angewendet:</p>
          
          <div style="background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0;"><strong>ELO-Punkte reduziert:</strong> ${oldElo} → ${newElo} (-10 Punkte)</p>
          </div>
          
          <p>Um weitere Strafen zu vermeiden und deine Rangliste zu verbessern, empfehlen wir dir, bald wieder zu spielen und deine Spiele im System einzutragen.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/game/add" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Spiel eintragen
            </a>
          </div>
          
          <p>Denke daran, dass du alle 7 Tage mindestens ein Spiel spielen solltest, um Inaktivitätsstrafen zu vermeiden.</p>
          
          <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px;">Dies ist eine automatische Nachricht des padELO Ranking Systems.</p>
        </div>
      `
    };
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Inactivity penalty email sent to: ${user.email}`);
    
  } catch (error) {
    console.error('Error sending inactivity penalty email:', error);
    throw error; // Re-throw to be handled by the caller
  }
};
  
  module.exports = {
    sendRegistrationRequestEmail,
    sendRegistrationApprovedEmail,
    sendPasswordResetEmail,
    sendGameReportEmail,
    sendInactivityPenaltyEmail 
  };