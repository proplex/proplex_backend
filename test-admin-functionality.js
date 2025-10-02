// Test script to verify admin registration functionality
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock User model
const users = [];

class User {
  constructor(data) {
    this.email = data.email;
    this.password = data.password;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.role = data.role;
    this.isEmailVerified = data.isEmailVerified;
    this.isActive = data.isActive;
    this.id = Date.now().toString();
  }

  async save() {
    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    users.push(this);
    return this;
  }

  static async findOne(query) {
    return users.find(user => user.email === query.email) || null;
  }
}

// Admin credentials
const ADMIN_EMAIL = 'proplex@gmail.com';
const ADMIN_PASSWORD = 'Abcd@1234';
const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// Admin registration function (similar to the one in admin.controller.ts)
const adminRegister = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if this is the fixed admin account
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      try {
        // Try to create admin user in database
        let user = await User.findOne({ email: ADMIN_EMAIL });
        
        if (!user) {
          // Create admin user if not exists
          user = new User({
            email: ADMIN_EMAIL,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            password: ADMIN_PASSWORD, // Will be hashed by the pre-save hook
            isEmailVerified: true,
            isActive: true,
          });
          await user.save();
          console.log('Admin user created:', user);
        } else if (user.role !== 'admin') {
          // Update user role to admin if it's not already
          user.role = 'admin';
          console.log('Admin user updated:', user);
        }

        return res.status(201).json({
          success: true,
          message: 'Admin user created/updated successfully',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        });
      } catch (dbError) {
        // If database operation fails, still return success but with a warning
        console.error('Database error during admin registration:', dbError);
        return res.status(201).json({
          success: true,
          message: 'Admin credentials validated but database operation failed. You can still login with the fixed credentials.',
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Only the fixed admin credentials can be registered'
      });
    }
  } catch (error) {
    console.error('Error in adminRegister:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Express app setup
const app = express();
app.use(express.json());

// Admin registration route
app.post('/api/admin/register', 
  [
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long'),
  ],
  validateRequest,
  adminRegister
);

// Start server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`Try POST to http://localhost:${PORT}/api/admin/register with:`);
  console.log(`Body: { "email": "proplex@gmail.com", "password": "Abcd@1234" }`);
});