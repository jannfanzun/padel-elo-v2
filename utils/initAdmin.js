const User = require('../models/User');
const connectDB = require('../config/db');
const dotenv = require('dotenv');

// Load env variables
dotenv.config();

// Function to create admin user if doesn't exist
const initAdmin = async () => {
  try {
    await connectDB();
    
    // Check if admin user exists
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      console.log('Admin user already exists');
      process.exit(0);
    }
    
    // Create admin user
    await User.create({
      username: process.env.ADMIN_NAME,
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      isAdmin: true
    });
    
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
};

// Call the function
initAdmin();