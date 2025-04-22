const User = require('../models/User');
// const { sendInactivityPenaltyEmail } = require('../config/email');

/**
 * Überprüft alle Benutzer auf Inaktivität und wendet Strafen an
 * Inaktiv = kein Spiel in den letzten 7 Tagen
 * Strafe = -10 ELO-Punkte
 */
const checkInactiveUsers = async () => {
  try {
    console.log('Starting inactivity check...');
    
    // Berechne das Datum vor 7 Tagen
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Finde alle Benutzer, die seit mehr als 7 Tagen inaktiv sind
    // und die nicht bereits heute wegen Inaktivität bestraft wurden
    // (um doppelte Strafen zu vermeiden, falls der Job mehrmals am Tag läuft)
    const inactiveUsers = await User.find({
      isAdmin: false, // Admin-Benutzer ausschliessen
      lastActivity: { $lt: sevenDaysAgo },
      // Prüfe, ob das Inaktivitäts-Datum in letzten 24 Stunden liegt
      lastInactivityPenalty: { 
        $not: { 
          $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        } 
      }
    });
    
    console.log(`Found ${inactiveUsers.length} inactive users`);
    
    // Wende die Strafe auf jeden inaktiven Benutzer an
    for (const user of inactiveUsers) {
      const oldElo = user.eloRating;
      
      // Reduziere ELO-Punkte um 10
      user.eloRating = Math.max(user.eloRating - 10, 0); // Verhindere negative Werte
      
      // Aktualisiere das Datum der letzten Inaktivitätsstrafe
      user.lastInactivityPenalty = new Date();
      
      // Speichere die Änderungen
      await user.save();
      
      console.log(`Applied inactivity penalty to user ${user.username}. ELO: ${oldElo} -> ${user.eloRating}`);
      
      // Sende eine E-Mail-Benachrichtigung
      try {
        // await sendInactivityPenaltyEmail(user, oldElo, user.eloRating);
        console.log(`Sent inactivity penalty email to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send inactivity penalty email to ${user.email}:`, emailError);
      }
    }
    
    console.log('Inactivity check completed.');
  } catch (error) {
    console.error('Error during inactivity check:', error);
  }
};

module.exports = {
  checkInactiveUsers
};