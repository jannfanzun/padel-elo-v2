const User = require('../models/User');
const RegistrationRequest = require('../models/RegistrationRequest');
const { generateToken } = require('../config/jwt');

// @desc    Show login page
// @route   GET /auth/login
// @access  Public
exports.getLogin = (req, res) => {
  if (req.user) {
    if (req.user.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/user/profile');
  }
  
  res.render('auth/login', {
    title: 'Login',
    error: req.query.error || null
  });
};

// @desc    Process login
// @route   POST /auth/login
// @access  Public
exports.postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return res.redirect('/auth/login?error=Please provide email and password');
    }
    
    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.redirect('/auth/login?error=Invalid credentials');
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.redirect('/auth/login?error=Invalid credentials');
    }
    
    // Update last activity
    await user.updateActivity();
    
    // Generate token
    const token = generateToken(user._id, user.isAdmin);
    
    // Save token in cookie
    const options = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res.cookie('token', token, options);
    
    // Redirect to appropriate dashboard
    if (user.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    
    const returnTo = req.session.returnTo || '/user/profile';
    delete req.session.returnTo;
    
    res.redirect(returnTo);
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/auth/login?error=Server error');
  }
};

// @desc    Show registration page
// @route   GET /auth/register
// @access  Public
exports.getRegister = (req, res) => {
  if (req.user) {
    if (req.user.isAdmin) {
      return res.redirect('/admin/dashboard');
    }
    return res.redirect('/user/profile');
  }
  
  res.render('auth/register', {
    title: 'Register',
    error: req.query.error || null,
    success: req.query.success || null
  });
};

// @desc    Process registration
// @route   POST /auth/register
// @access  Public
exports.postRegister = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.redirect('/auth/register?error=Please fill in all fields');
    }
    
    if (password !== confirmPassword) {
      return res.redirect('/auth/register?error=Passwords do not match');
    }
    
    // Check if username already exists in User collection
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.redirect('/auth/register?error=Username already exists');
    }
    
    // Check if email already exists in User collection
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.redirect('/auth/register?error=Email already exists');
    }
    
    // Check if username already exists in RegistrationRequest collection
    const existingUsernameRequest = await RegistrationRequest.findOne({ 
      username, 
      status: 'pending' 
    });
    
    if (existingUsernameRequest) {
      return res.redirect('/auth/register?error=A registration request with this username is already pending');
    }
    
    // Check if email already exists in RegistrationRequest collection
    const existingEmailRequest = await RegistrationRequest.findOne({ 
      email, 
      status: 'pending' 
    });
    
    if (existingEmailRequest) {
      return res.redirect('/auth/register?error=A registration request with this email is already pending');
    }
    
    // Create registration request
    await RegistrationRequest.create({
      username,
      email,
      password,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.redirect('/auth/register?success=Registration request submitted. Please wait for admin approval.');
  } catch (error) {
    console.error('Registration error:', error);
    res.redirect('/auth/register?error=Server error');
  }
};

// @desc    Logout user
// @route   GET /auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true
  });
  
  res.redirect('/');
};