// Test script to verify admin registration and login routes
const express = require('express');
const app = express();

// Mock the validateRequest middleware
const validateRequest = (req, res, next) => next();

// Create a simple mock of the admin controller functions
const adminLogin = (req, res) => {
  res.json({ 
    success: true,
    token: 'mock-jwt-token',
    user: {
      id: 'mock-user-id',
      email: 'proplex@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }
  });
};

const adminRegister = (req, res) => {
  res.json({ 
    success: true,
    message: 'Admin user created/updated successfully',
    user: {
      id: 'mock-user-id',
      email: 'proplex@gmail.com',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    }
  });
};

// Create admin routes manually for testing
const adminRouter = express.Router();

// Admin login route
adminRouter.post('/login', adminLogin);

// Admin register route
adminRouter.post('/register', adminRegister);

// Use the admin routes
app.use('/api/admin', adminRouter);

// Add a simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Start a test server
const port = 3003;
app.listen(port, () => {
  console.log(`\nTest server running on port ${port}`);
  console.log('You can test the following endpoints:');
  console.log(`  GET  http://localhost:${port}/test`);
  console.log(`  POST http://localhost:${port}/api/admin/login`);
  console.log(`  POST http://localhost:${port}/api/admin/register`);
  
  console.log('\nTo test registration, use:');
  console.log(`  curl -X POST http://localhost:${port}/api/admin/register \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d \'{"email":"proplex@gmail.com","password":"Abcd@1234"}\'`);
  
  console.log('\nTo test login, use:');
  console.log(`  curl -X POST http://localhost:${port}/api/admin/login \\`);
  console.log(`       -H "Content-Type: application/json" \\`);
  console.log(`       -d \'{"email":"proplex@gmail.com","password":"Abcd@1234"}\'`);
});