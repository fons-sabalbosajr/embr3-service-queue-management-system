const crypto = require('crypto');
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ['Super Admin/Developer', 'Admin', 'Queue Officer', 'Queue Number Officer', 'Secretariat'],
      default: 'Admin',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Inactive'],
      default: 'Active',
    },
    accessModules: {
      type: [String],
      default: ['dashboard'],
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  { timestamps: true }
);

// Generate a password reset token, store its hash, and return the raw token.
adminSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token valid for 30 minutes.
  this.resetPasswordExpire = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('Admin', adminSchema);
