const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const Admin = require('../models/Admin');
const sendEmail = require('../utils/sendEmail');
const { accessModulesForRole, normalizeRole } = require('../utils/roles');
const {
  passwordResetTemplate,
  welcomeTemplate,
} = require('../utils/emailTemplates');

function signToken(adminId) {
  return jwt.sign({ id: adminId }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
}

function clientBaseUrl() {
  const raw = process.env.CLIENT_URL || 'http://localhost:5173';
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

function publicAdmin(admin) {
  return {
    id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    accessModules: admin.accessModules || [],
  };
}

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name, email, password, role = 'Admin' } = req.body;
    const normalizedRole = normalizeRole(role);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res
        .status(409)
        .json({ message: 'An admin with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      status: 'Active',
      accessModules: accessModulesForRole(normalizedRole),
    });

    // Best-effort welcome email; account creation should not fail if email fails.
    try {
      const { subject, html } = welcomeTemplate({ name: admin.name });
      await sendEmail({ to: admin.email, subject, html });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError.message);
    }

    const token = signToken(admin._id);

    return res.status(201).json({
      token,
      admin: publicAdmin(admin),
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Failed to create account.' });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    }).select('+password');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(admin._id);

    return res.json({
      token,
      admin: publicAdmin(admin),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Failed to sign in.' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    // Respond the same way whether or not the account exists.
    const genericMessage =
      'If an account exists for that email, a recovery link has been sent.';

    if (!admin) {
      return res.json({ message: genericMessage });
    }

    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });

    const resetUrl = `${clientBaseUrl()}/admin/reset-password/${resetToken}`;

    try {
      const { subject, html } = passwordResetTemplate({
        name: admin.name,
        resetUrl,
      });
      await sendEmail({ to: admin.email, subject, html });
    } catch (emailError) {
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpire = undefined;
      await admin.save({ validateBeforeSave: false });
      console.error('Reset email failed:', emailError.message);
      return res
        .status(500)
        .json({ message: 'Could not send recovery email. Try again later.' });
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Failed to process request.' });
  }
}

// POST /api/auth/reset-password/:token
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res
        .status(400)
        .json({ message: 'Password must be at least 8 characters.' });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!admin) {
      return res
        .status(400)
        .json({ message: 'Reset link is invalid or has expired.' });
    }

    admin.password = await bcrypt.hash(password, 12);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save();

    const authToken = signToken(admin._id);

    return res.json({
      message: 'Password updated successfully.',
      token: authToken,
      admin: publicAdmin(admin),
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Failed to reset password.' });
  }
}

// GET /api/auth/me  (protected)
async function getMe(req, res) {
  return res.json({ admin: publicAdmin(req.admin) });
}

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
};
