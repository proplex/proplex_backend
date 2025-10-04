const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');

// Generate a valid admin token with the correct userId from your database
const JWT_SECRET = 'proplex_jwt_secret';
const adminPayload = {
  id: '68deaa7ddcbbfeff5b120f53', // This is the correct userId from your database
  email: 'everythinggaurav48@gmail.com',
  role: 'admin'
};

const ADMIN_TOKEN = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Generated admin token with correct userId');

// Generate a random string for unique values
const randomString = crypto.randomBytes(8).toString('hex');

// Company data to create with truly unique values
const companyData = {
  "name": "Unique Test Company " + randomString,
  "industry": "Technology",
  "incorporationType": "private_limited",
  "jurisdiction": "USA",
  "registrationNumber": "UNIQUE_REG_" + randomString,
  "cinNumber": "UNIQUE_CIN_" + randomString,
  "panNumber": "UNIQUE_PAN_" + randomString,
  "gstNumber": "UNIQUE_GST_" + randomString,
  "email": "unique_" + randomString + "@company.com",
  "phone": "+1234567890",
  "address": "123 Main Street",
  "city": "Test City",
  "state": "Test State",
  "country": "Test Country",
  "pincode": "123456"
};

async function createUniqueCompany() {
  try {
    console.log('Creating company with unique values...');
    console.log('Company data:', companyData);
    
    const response = await axios.post('http://localhost:3001/api/companies', companyData, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Company created successfully!');
    console.log('Response status:', response.status);
    console.log('Company ID:', response.data.data._id);
    
  } catch (error) {
    console.error('Error creating company:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

createUniqueCompany();