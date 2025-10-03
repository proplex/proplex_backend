const jwt = require('jsonwebtoken');

// Replace with your actual admin token
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI2N2Y4Y2FkNjFkZDQxY2M4Y2Y2ZTQ0MCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjgzNzY0MzksImV4cCI6MTcyODQ2MjgzOX0.0r8Y8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8';

const JWT_SECRET = process.env.JWT_SECRET || 'proplex_jwt_secret';

try {
  const decoded = jwt.verify(ADMIN_TOKEN, JWT_SECRET);
  console.log('Decoded token:', decoded);
  console.log('Role:', decoded.role);
  console.log('Has admin role:', decoded.role === 'admin');
} catch (error) {
  console.error('Token verification error:', error.message);
}