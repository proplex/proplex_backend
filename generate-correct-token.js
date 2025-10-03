const jwt = require('jsonwebtoken');

// Generate a valid admin token with the correct userId from your database
const JWT_SECRET = 'proplex_jwt_secret';
const adminPayload = {
  id: '68deaa7ddcbbfeff5b120f53', // This is the correct userId from your database
  email: 'everythinggaurav48@gmail.com',
  role: 'admin'
};

const ADMIN_TOKEN = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Use this token in your Authorization header:');
console.log('Bearer', ADMIN_TOKEN);
console.log('');
console.log('This token contains the correct userId from your database:');
console.log('UserId:', adminPayload.id);
console.log('Email:', adminPayload.email);
console.log('Role:', adminPayload.role);