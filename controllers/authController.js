const User = require('../models/User');
const RegistrationRequest = require('../models/RegistrationRequest');
const { generateToken } = require('../config/jwt');
const { sendRegistrationRequestEmail, sendPasswordResetEmail } = require('../config/email');
const crypto = require('crypto');

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
      
      console.log(`Login attempt for email: ${email}`);
      
      // Check if email and password are provided
      if (!email || !password) {
        return res.redirect('/auth/login?error=Please provide email and password');
      }
      
      // Find the user WITH password field included
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        console.log(`Login failed: No user found with email ${email}`);
        return res.redirect('/auth/login?error=Invalid credentials');
      }
      
      console.log(`User found: ${user.username}, checking password now...`);
      console.log(`Password from DB (hashed): ${user.password.substring(0, 10)}...`);
      
      // Direct bcrypt comparison instead of using the model method
      const bcrypt = require('bcryptjs');
      const isMatch = await bcrypt.compare(password, user.password);
      
      if (!isMatch) {
        console.log(`Login failed: Password mismatch for user ${email}`);
        return res.redirect('/auth/login?error=Invalid credentials');
      }
      
      console.log(`Login successful for user ${user.username}`);
      
      // Update last activity
      user.lastActivity = Date.now();
      await User.findByIdAndUpdate(user._id, { lastActivity: Date.now() });
      
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
const newRequest = await RegistrationRequest.create({
    username,
    email,
    password,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  // Send email notification to admin
  await sendRegistrationRequestEmail(newRequest);
  
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
  
  // @desc    Show forgot password page
  // @route   GET /auth/forgot-password
  // @access  Public
  exports.getForgotPassword = (req, res) => {
    res.render('auth/forgotPassword', {
      title: 'Passwort vergessen',
      error: req.query.error || null,
      success: req.query.success || null
    });
  };
  
  // @desc    Process forgot password request
  // @route   POST /auth/forgot-password
  // @access  Public
  exports.postForgotPassword = async (req, res) => {
    try {
      const { email } = req.body;
      
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        // We don't want to reveal if a user exists or not for security reasons
        // Just show a success message anyway
        return res.render('auth/forgotPassword', {
          title: 'Passwort vergessen',
          success: 'Wenn eine Benutzer-Registrierung mit dieser E-Mail existiert, wurde dir ein Link zum Zurücksetzen des Passworts zugeschickt.'
        });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(20).toString('hex');
      
      // Hash token and set to resetPasswordToken field
      user.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Set expire (30 minutes)
      user.resetPasswordExpire = Date.now() + 30 * 60 * 1000;
      
      // Save user
      await user.save();
      
      // Create reset URL
      const resetUrl = `${process.env.SITE_URL}/auth/reset-password/${resetToken}`;
      
      // Send email
      await sendPasswordResetEmail(user, resetUrl);
      
      res.render('auth/forgotPassword', {
        title: 'Passwort vergessen',
        success: 'Wenn eine Benutzer-Registrierung mit dieser E-Mail existiert, wurde dir ein Link zum Zurücksetzen des Passworts zugeschickt.'
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      
      // Reset user fields in case of error
      if (error.user) {
        error.user.resetPasswordToken = undefined;
        error.user.resetPasswordExpire = undefined;
        await error.user.save();
      }
      
      res.redirect('/auth/forgot-password?error=Beim Senden der E-Mail ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
    }
  };
  
  // @desc    Show reset password page
  // @route   GET /auth/reset-password/:resetToken
  // @access  Public
  exports.getResetPassword = async (req, res) => {
    try {
      const { resetToken } = req.params;
      
      // Hash token
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Find user by token and check if expired
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.redirect('/auth/forgot-password?error=Ungültiger oder abgelaufener Token. Bitte fordere einen neuen Link an.');
      }
      
      res.render('auth/resetPassword', {
        title: 'Passwort zurücksetzen',
        resetToken,
        error: req.query.error || null,
        success: null
      });
    } catch (error) {
      console.error('Reset password page error:', error);
      res.redirect('/auth/forgot-password?error=Beim Laden der Seite ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
    }
  };
  
  // @desc    Process reset password
  // @route   POST /auth/reset-password/:resetToken
  // @access  Public
  exports.postResetPassword = async (req, res) => {
    try {
      const { resetToken } = req.params;
      const { password, confirmPassword } = req.body;
      
      // Check if passwords match
      if (password !== confirmPassword) {
        return res.redirect(`/auth/reset-password/${resetToken}?error=Die Passwörter stimmen nicht überein.`);
      }
      
      // Hash token
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Find user by token and check if expired
      const user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
      });
      
      if (!user) {
        return res.redirect('/auth/forgot-password?error=Ungültiger oder abgelaufener Token. Bitte fordere einen neuen Link an.');
      }
      
      // Set new password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      
      // Save user
      await user.save();
      
      res.render('auth/resetPassword', {
        title: 'Passwort zurücksetzen',
        resetToken: null,
        success: 'Dein Passwort wurde erfolgreich zurückgesetzt.'
      });
    } catch (error) {
      console.error('Reset password error:', error);
      res.redirect(`/auth/reset-password/${req.params.resetToken}?error=Beim Zurücksetzen des Passworts ist ein Fehler aufgetreten. Bitte versuche es später erneut.`);
    }
  };