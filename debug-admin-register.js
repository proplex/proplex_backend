// Debug script to test admin registration
const express = require('express');
const app = express();
const { body, validationResult } = require('express-validator');

app.use(express.json());

// Mock validation middleware
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

// Mock admin credentials
const ADMIN_EMAIL = 'everythinggaurav48@gmail.com';
const ADMIN_PASSWORD = 'Abcd@1234';

// Simple mock User model
const users = [];

class MockUser {
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
    console.log('Saving user:', this);
    users.push(this);
    return this;
  }

  static async findOne(query) {
    console.log('Finding user with query:', query);
    const user = users.find(u => u.email === query.email);
    console.log('Found user:', user);
    return user || null;
  }
}

// Admin registration function with debug logging
const adminRegister = async (req, res) => {
  try {
    console.log('=== Admin Registration Request ===');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;
    console.log("admin login and register information:", email, password);

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: Email or password missing');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if this is the fixed admin account
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      console.log('Credentials match admin credentials');
      try {
        // Try to create admin user in database
        console.log('Looking for existing user...');
        let user = await MockUser.findOne({ email: ADMIN_EMAIL });
        console.log('Existing user lookup result:', user);
        
        if (!user) {
          console.log('No existing user found, creating new admin user');
          // Create admin user if not exists
          user = new MockUser({
            email: ADMIN_EMAIL,
            firstName: 'Admin',
            lastName: 'User',
            role: 'admin',
            password: ADMIN_PASSWORD,
            isEmailVerified: true,
            isActive: true,
          });
          await user.save();
          console.log('New user created:', user);
        } else if (user.role !== 'admin') {
          console.log('User exists but is not admin, updating role');
          // Update user role to admin if it's not already
          user.role = 'admin';
          console.log('User role updated:', user);
        } else {
          console.log('User already exists as admin');
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
      console.log('Credentials do not match admin credentials');
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
const PORT = 3005;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Try POST to http://localhost:${PORT}/api/admin/register with:`);
  console.log(`Body: { "email": "everythinggaurav48@gmail.com", "password": "Abcd@1234" }`);
});