const jwt = require('jsonwebtoken');

// Generate a valid admin token with a proper ObjectId format
const JWT_SECRET = 'proplex_jwt_secret';
const adminPayload = {
  id: '507f1f77bcf86cd799439011', // Valid ObjectId format (24 hex characters)
  email: 'admin@example.com',
  role: 'admin'
};

const ADMIN_TOKEN = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Use this token in your Authorization header:');
console.log('Bearer', ADMIN_TOKEN);