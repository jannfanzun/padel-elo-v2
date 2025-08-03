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
    subject: '🎉 Willkommen bei padELO – Registrierung bestätigt!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #0d6efd;">Willkommen bei padELO!</h2>
        <p>Hallo ${user.username},</p>
        
        <p>Deine Registrierung wurde genehmigt. Du kannst dich jetzt anmelden und loslegen!</p>
        
        <div style="background-color: #e7f1ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Deine Anmeldedaten:</strong></p>
          <p style="margin: 5px 0;">E-Mail: ${user.email}</p>
          <p style="margin: 5px 0;">Start-ELO: 500 Punkte</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.SITE_URL}/auth/login" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-bottom: 10px;">
            Jetzt anmelden
          </a>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0d6efd; margin-top: 0;">So geht's weiter:</h3>
          
          <p><strong>1. Community beitreten:</strong></p>
          <p style="margin-bottom: 15px;">In der WhatsApp Gruppe bleibst du über Termine informiert und kannst dich mit anderen Spielern vernetzen.</p>
          <div style="text-align: center; margin: 15px 0;">
            <a href="https://chat.whatsapp.com/D5I7K6NR3anGu5iU7Huf7w?mode=ac_t" 
               target="_blank" 
               style="background-color: #25D366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              WhatsApp Gruppe beitreten
            </a>
          </div>
          <p><strong>2. Platz buchen:</strong></p>
          <div style="text-align: center; margin: 15px 0;">
            <a href="https://www.eversports.ch/org/activity/bb89b350-52c1-4372-a95b-9457fa0063ca" 
               target="_blank" 
               style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Platz buchen bei Eversports
            </a>
          </div>
        
        </div>
        
        <p><strong>Wichtig:</strong> Nach jedem Spiel trägst du das Ergebnis im padELO System ein. So wird dein Ranking berechnet!</p>
        
        <p>Viel Spass beim Spielen!🥎</p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="color: #6c757d; font-size: 0.9em; text-align: center;">
          Dies ist eine automatische Nachricht von padELO Ranking.<br>
          Bei Fragen einfach in der WhatsApp Gruppe melden!
        </p>
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
  console.log(`Inactivity penalty email DISABLED for: ${user.email}`);
  return; // Early return to prevent sending the email
  
  /*
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
  */
};
  
/**
 * Send game notification email to all players involved in a game
 * @param {Object} game - Fully populated game object with player details
 */
const sendGameNotificationEmail = async (game) => {
  try {
    const transporter = createTransporter();
    
    // For each player in both teams, send a notification email
    const allPlayers = [...game.team1, ...game.team2];
    
    for (const playerData of allPlayers) {
      const player = playerData.player;
      
      // Determine if player won or lost
      const playerTeam = game.team1.some(p => p.player._id.toString() === player._id.toString()) ? 'team1' : 'team2';
      const isWinner = playerTeam === game.winner;
      const outcomeClass = isWinner ? 'success' : 'danger';
      const outcomeText = isWinner ? 'gewonnen' : 'verloren';
      const outcomeIcon = isWinner ? '🏆' : '📉';
      
      // Get opponent team names
      const opponentTeam = playerTeam === 'team1' ? game.team2 : game.team1;
      const teammateData = game.team1.some(p => p.player._id.toString() === player._id.toString()) 
        ? game.team1.find(p => p.player._id.toString() !== player._id.toString())
        : game.team2.find(p => p.player._id.toString() !== player._id.toString());
      
      // Format score based on player's team
      const playerScore = playerTeam === 'team1' ? game.score.team1 : game.score.team2;
      const opponentScore = playerTeam === 'team1' ? game.score.team2 : game.score.team1;
      
      // Email content
      const mailOptions = {
        from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
        to: player.email,
        subject: `${outcomeIcon} Spiel eingetragen: ${playerScore}-${opponentScore} ${isWinner ? 'Gewonnen!' : 'Verloren'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: ${isWinner ? '#198754' : '#dc3545'};">Spiel ${outcomeText}: ${playerScore}-${opponentScore}</h2>
            
            <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: ${isWinner ? '#d1e7dd' : '#f8d7da'}; color: ${isWinner ? '#0f5132' : '#842029'}; border-radius: 5px;">
              <h3 style="margin-top: 0;">${isWinner ? 'Glückwunsch!' : 'Nächstes Mal klappt es besser!'}</h3>
              <p style="font-size: 18px; margin-bottom: 0;">
                Deine ELO-Änderung: <strong>${playerData.eloChange >= 0 ? '+' : ''}${playerData.eloChange}</strong> 
                (${playerData.eloBeforeGame} → ${playerData.eloAfterGame})
              </p>
            </div>
            
            <div style="margin-bottom: 20px;">
              <h3 style="border-bottom: 1px solid #e0e0e0; padding-bottom: 10px;">Spieldetails</h3>
              
              <div style="display: flex; margin-bottom: 15px;">
                <div style="flex: 1; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px; margin-right: 5px;">
                  <h4 style="margin-top: 0;">Dein Team</h4>
                  <p><strong>Du:</strong> ${player.username} (${playerData.eloBeforeGame} → ${playerData.eloAfterGame})</p>
                  <p><strong>Teamkollege:</strong> ${teammateData.player.username} (${teammateData.eloBeforeGame} → ${teammateData.eloAfterGame})</p>
                </div>
                <div style="flex: 1; text-align: center; padding: 10px; background-color: #f8f9fa; border-radius: 5px; margin-left: 5px;">
                  <h4 style="margin-top: 0;">Gegnerteam</h4>
                  <p><strong>${opponentTeam[0].player.username}</strong> (${opponentTeam[0].eloBeforeGame} → ${opponentTeam[0].eloAfterGame})</p>
                  <p><strong>${opponentTeam[1].player.username}</strong> (${opponentTeam[1].eloBeforeGame} → ${opponentTeam[1].eloAfterGame})</p>
                </div>
              </div>
              
              <p><strong>Datum:</strong> ${new Date(game.createdAt).toLocaleDateString('de-DE', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><strong>Eingetragen von:</strong> ${game.createdBy.username}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.SITE_URL}/game/${game._id}" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Spieldetails ansehen
              </a>
            </div>
            
            <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px; text-align: center;">
              Dies ist eine automatische Nachricht von padELO Ranking.
            </p>
          </div>
        `
      };
      
      // Send email
      await transporter.sendMail(mailOptions);
      console.log(`Game notification email sent to ${player.email}`);
    }
  } catch (error) {
    console.error('Error sending game notification emails:', error);
  }
};

module.exports = {
  sendRegistrationRequestEmail,
  sendRegistrationApprovedEmail,
  sendPasswordResetEmail,
  sendGameReportEmail,
  sendInactivityPenaltyEmail,
  sendGameNotificationEmail // Export the new function
};