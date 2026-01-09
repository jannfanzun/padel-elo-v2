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
            <a href="https://www.eversports.ch/org/widget/d89ac8c4-286b-4f50-a259-b5f3980bb6c7?venueId=726b961f-73a5-4437-8e51-c579d087c0d9" 
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

/**
 * Send quarterly ELO report email to admin
 * @param {Object} reportData - Report data containing quarter info and player stats
 */
const sendQuarterlyReportEmail = async (reportData) => {
  try {
    const transporter = createTransporter();

    const { year, quarter, players, totalGames } = reportData;
    const quarterNames = ['Q1 (Jan-Mär)', 'Q2 (Apr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Okt-Dez)'];
    const quarterName = quarterNames[quarter];

    // Build player ranking table rows
    let playerRows = '';
    players.forEach((player, index) => {
      const eloChangeColor = player.eloChange >= 0 ? '#198754' : '#dc3545';
      const eloChangePrefix = player.eloChange >= 0 ? '+' : '';

      playerRows += `
        <tr style="border-bottom: 1px solid #e0e0e0;">
          <td style="padding: 10px; text-align: center;">${index + 1}</td>
          <td style="padding: 10px;">${player.username}</td>
          <td style="padding: 10px; text-align: center;">${player.startELO}</td>
          <td style="padding: 10px; text-align: center;">${player.endELO}</td>
          <td style="padding: 10px; text-align: center; color: ${eloChangeColor}; font-weight: bold;">${eloChangePrefix}${player.eloChange}</td>
          <td style="padding: 10px; text-align: center;">${player.gamesPlayed}</td>
        </tr>
      `;
    });

    // Find top performers
    const topGainer = players.reduce((prev, current) => (prev.eloChange > current.eloChange) ? prev : current, players[0]);
    const mostActive = players.reduce((prev, current) => (prev.gamesPlayed > current.gamesPlayed) ? prev : current, players[0]);

    // Email content
    const mailOptions = {
      from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `📊 Quarterly ELO Report - ${quarterName} ${year}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0d6efd; text-align: center;">📊 Quarterly ELO Report</h2>
          <h3 style="text-align: center; color: #6c757d;">${quarterName} ${year}</h3>

          <div style="background-color: #e7f1ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Quartalsübersicht</h4>
            <p><strong>Aktive Spieler:</strong> ${players.length}</p>
            <p><strong>Gespielte Spiele:</strong> ${totalGames}</p>
            ${topGainer ? `<p><strong>Grösster Aufsteiger:</strong> ${topGainer.username} (${topGainer.eloChange >= 0 ? '+' : ''}${topGainer.eloChange} ELO)</p>` : ''}
            ${mostActive ? `<p><strong>Aktivster Spieler:</strong> ${mostActive.username} (${mostActive.gamesPlayed} Spiele)</p>` : ''}
          </div>

          <h4>Rangliste nach End-ELO</h4>
          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <thead>
              <tr style="background-color: #0d6efd; color: white;">
                <th style="padding: 12px; text-align: center;">Rang</th>
                <th style="padding: 12px; text-align: left;">Spieler</th>
                <th style="padding: 12px; text-align: center;">Start ELO</th>
                <th style="padding: 12px; text-align: center;">End ELO</th>
                <th style="padding: 12px; text-align: center;">Änderung</th>
                <th style="padding: 12px; text-align: center;">Spiele</th>
              </tr>
            </thead>
            <tbody>
              ${playerRows}
            </tbody>
          </table>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/ranking" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Zum aktuellen Ranking
            </a>
          </div>

          <p style="color: #6c757d; font-size: 0.9em; margin-top: 30px; text-align: center;">
            Dies ist eine automatische Nachricht von padELO Ranking.<br>
            Generiert am ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`Quarterly report email sent to admin for ${quarterName} ${year}`);

  } catch (error) {
    console.error('Error sending quarterly report email:', error);
  }
};

/**
 * Send shirt level up notification email to admin
 * @param {Object} user - User who leveled up
 * @param {Object} levelUpInfo - Level up details (oldLevel, newLevel, etc.)
 */
const sendShirtLevelUpEmail = async (user, levelUpInfo) => {
  try {
    const transporter = createTransporter();

    const { oldLevel, oldColor, newLevel, newColor, gamesPlayed } = levelUpInfo;

    // Color mapping for display
    const colorNames = {
      '#bebebe': 'Grau',
      'white': 'Weiss',
      'yellow': 'Gelb',
      'orange': 'Orange',
      'green': 'Grün',
      'blue': 'Blau',
      'purple': 'Lila',
      'black': 'Schwarz'
    };

    const colorStyles = {
      '#bebebe': '#bebebe; color: #212529; border: 1px solid #dee2e6',
      'white': 'white; color: #212529; border: 1px solid #dee2e6',
      'yellow': '#ffc107; color: #212529',
      'orange': '#fd7e14; color: white',
      'green': '#198754; color: white',
      'blue': '#0d6efd; color: white',
      'purple': '#6f42c1; color: white',
      'black': '#212529; color: white'
    };

    // Email content
    const mailOptions = {
      from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
      to: process.env.ADMIN_EMAIL,
      subject: `👕 Neues Shirt Level: ${user.username} ist jetzt ${newLevel}!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #0d6efd; text-align: center;">👕 Neues Shirt Level erreicht!</h2>

          <div style="text-align: center; margin: 20px 0;">
            <p style="font-size: 18px; margin-bottom: 15px;"><strong>${user.username}</strong> hat ein neues Shirt Level erreicht!</p>
          </div>

          <div style="display: flex; justify-content: center; align-items: center; margin: 30px 0;">
            <div style="text-align: center; padding: 15px;">
              <span style="display: inline-block; padding: 10px 20px; border-radius: 5px; background-color: ${colorStyles[oldColor]};">
                ${oldLevel}
              </span>
              <p style="color: #6c757d; margin-top: 10px; font-size: 14px;">${colorNames[oldColor]}</p>
            </div>
            <div style="padding: 0 20px; font-size: 24px;">→</div>
            <div style="text-align: center; padding: 15px;">
              <span style="display: inline-block; padding: 10px 20px; border-radius: 5px; background-color: ${colorStyles[newColor]};">
                ${newLevel}
              </span>
              <p style="color: #6c757d; margin-top: 10px; font-size: 14px;">${colorNames[newColor]}</p>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
            <p style="margin: 0;"><strong>Gespielte Spiele:</strong> ${gamesPlayed}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.SITE_URL}/ranking" style="background-color: #0d6efd; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Zum Ranking
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
    console.log(`Shirt level up email sent to admin for user: ${user.username} (${oldLevel} -> ${newLevel})`);

  } catch (error) {
    console.error('Error sending shirt level up email:', error);
  }
};

/**
 * Send schedule notification email to all players in the schedule
 * @param {Object} schedule - Populated schedule object with players
 * @param {Array} courts - Array of court assignments with matchups
 */
const sendScheduleNotificationEmail = async (schedule, courts) => {
  try {
    const transporter = createTransporter();

    // Format start time
    const moment = require('moment-timezone');
    const startTime = moment(schedule.startTime).tz('Europe/Zurich');
    const dateStr = startTime.format('DD.MM.YYYY');
    const timeStr = startTime.format('HH:mm');

    // Build courts HTML
    let courtsHTML = '';
    courts.forEach((court) => {
      courtsHTML += `
        <div style="background-color: #f8f9fa; border-left: 4px solid #0d6efd; padding: 15px; margin: 10px 0; border-radius: 5px;">
          <h4 style="color: #0d6efd; margin-top: 0;">${court.courtName}</h4>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1; text-align: center;">
              <strong>Team 1</strong><br>
              ${court.team1[0].username} (${court.team1[0].elo})<br>
              ${court.team1[1].username} (${court.team1[1].elo})<br>
              <small style="color: #6c757d;">Ø ${court.team1Elo} ELO</small>
            </div>
            <div style="padding: 0 15px; font-weight: bold; color: #6c757d;">VS</div>
            <div style="flex: 1; text-align: center;">
              <strong>Team 2</strong><br>
              ${court.team2[0].username} (${court.team2[0].elo})<br>
              ${court.team2[1].username} (${court.team2[1].elo})<br>
              <small style="color: #6c757d;">Ø ${court.team2Elo} ELO</small>
            </div>
          </div>
        </div>
      `;
    });

    // Send email to each player
    for (const player of schedule.players) {
      const mailOptions = {
        from: `"padELO Ranking" <${process.env.EMAIL_FROM}>`,
        to: player.email,
        subject: `padELO Spielplan - Heute um ${timeStr} Uhr`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #0d6efd; text-align: center;">padELO Spielplan</h2>

            <p>Hallo ${player.username},</p>

            <p>Der Spielplan für heute ist verfügbar. Du bist dabei!</p>

            <div style="background-color: #e7f1ff; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
              <h3 style="margin-top: 0; color: #0d6efd;">${dateStr}</h3>
              <h2 style="margin-bottom: 0; color: #198754;">${timeStr} Uhr</h2>
            </div>

            <h3 style="border-bottom: 2px solid #0d6efd; padding-bottom: 10px;">Spielplan</h3>
            ${courtsHTML}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.SITE_URL}/dashboard" style="background-color: #0d6efd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Zum Dashboard
              </a>
            </div>

            <p style="text-align: center; color: #198754; font-size: 16px;">Bis gleich auf dem Platz!</p>

            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="color: #6c757d; font-size: 0.9em; text-align: center;">
              Dies ist eine automatische Nachricht von padELO Ranking.
            </p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`Schedule notification email sent to ${player.email}`);
    }

    console.log(`Schedule notification emails sent to ${schedule.players.length} players`);
    return { success: true, count: schedule.players.length };

  } catch (error) {
    console.error('Error sending schedule notification emails:', error);
    throw error;
  }
};

module.exports = {
  sendRegistrationRequestEmail,
  sendRegistrationApprovedEmail,
  sendPasswordResetEmail,
  sendGameReportEmail,
  sendInactivityPenaltyEmail,
  sendGameNotificationEmail,
  sendQuarterlyReportEmail,
  sendShirtLevelUpEmail,
  sendScheduleNotificationEmail
};