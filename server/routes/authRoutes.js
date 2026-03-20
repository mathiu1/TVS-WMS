const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const authorize = require('../middleware/role');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user (Manager only)
// @access  Private (Manager)
router.post('/register', auth, authorize('manager'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email.',
      });
    }

    // Create user
    const user = await User.create({ name, email, password, role });

    res.status(201).json({
      success: true,
      message: 'User added successfully.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & return JWT
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged-in user
// @access  Private
router.get('/me', auth, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

// @route   PATCH /api/auth/users/:id/role
// @desc    Update user role (Manager only)
// @access  Private (Manager)
router.patch('/users/:id/role', auth, authorize('manager'), async (req, res) => {
  try {
    const { role } = req.body;

    if (!['employee', 'manager'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role.',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete a user (Manager only)
// @access  Private (Manager)
router.delete('/users/:id', auth, authorize('manager'), async (req, res) => {
  try {
    // Prevent self-deletion (auth middleware sets req.user.id)
    if (req.user.id.toString() === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Deactivate user instead of hard-deleting
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User account deactivated successfully. Historical records have been preserved.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/auth/users
// @desc    Get all users (Manager only)
// @access  Private (Manager)
router.get('/users', auth, authorize('manager'), async (req, res) => {
  try {
    const users = await User.find({ isActive: { $ne: false } }).select('-password').sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
