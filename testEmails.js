/**
 * Test Script for Email Functions
 * Run with: node testEmails.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { sendShirtLevelUpEmail, sendQuarterlyReportEmail } = require('./config/email');
const { getQuarterlyReportData } = require('./utils/quarterlyEloUtils');

const testEmails = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    const mongoUri = 'mongodb://mongo:mongo@83.228.193.33:27017/test?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('Connected!\n');

    // Get Q4 2024 data (quarter is 0-indexed, so Q4 = 3)
    const year = 2025;
    const quarter = 3; // Q4

    console.log(`=== Fetching Q4 ${year} Report Data ===`);
    const reportData = await getQuarterlyReportData(year, quarter);

    console.log(`Found ${reportData.players.length} players`);
    console.log(`Total games in Q4: ${reportData.totalGames}\n`);

    if (reportData.players.length > 0) {
      console.log('Players:');
      reportData.players.forEach((p, i) => {
        const change = p.eloChange >= 0 ? `+${p.eloChange}` : p.eloChange;
        console.log(`  ${i + 1}. ${p.username}: ${p.startELO} -> ${p.endELO} (${change}) - ${p.gamesPlayed} Spiele`);
      });
      console.log('');

      // Send the real quarterly report
      console.log('=== Sending Quarterly Report Email ===');
      await sendQuarterlyReportEmail(reportData);
      console.log('Quarterly Report Email sent!\n');
    } else {
      console.log('No players found for Q4 2024. No email sent.\n');
    }

    // Test Shirt Level Up Email with mock data
    console.log('=== Test: Shirt Level Up Email ===');
    const mockUser = {
      username: 'TestSpieler',
      email: 'test@example.com'
    };

    const mockLevelUp = {
      oldLevel: 'Beginner',
      oldColor: 'white',
      newLevel: 'Intermediate',
      newColor: 'yellow',
      gamesPlayed: 90
    };

    await sendShirtLevelUpEmail(mockUser, mockLevelUp);
    console.log('Shirt Level Up Email sent!\n');

    console.log('=== All tests completed! ===');
    console.log(`Check inbox of: ${process.env.ADMIN_EMAIL}`);

  } catch (error) {
    console.error('Error during email test:', error);
  }

  await mongoose.disconnect();
  process.exit(0);
};

// Run tests
testEmails();
