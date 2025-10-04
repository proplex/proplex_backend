const jwt = require('jsonwebtoken');
const axios = require('axios');

// Generate a valid admin token with the correct userId from your database
const JWT_SECRET = 'proplex_jwt_secret';
const adminPayload = {
  id: '68deaa7ddcbbfeff5b120f53', // This is the correct userId from your database
  email: 'everythinggaurav48@gmail.com',
  role: 'admin'
};

const ADMIN_TOKEN = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Generated admin token with correct userId');

// Company data to create with unique values
const companyData = {
  "name": "Test Company Unique " + Date.now(), // Make it unique with timestamp
  "industry": "Technology",
  "incorporationType": "private_limited",
  "jurisdiction": "USA",
  "registrationNumber": "REG" + Date.now(), // Make it unique with timestamp
  "email": "unique" + Date.now() + "@company.com", // Make it unique with timestamp
  "phone": "+1234567890",
  "address": "123 Main Street",
  "city": "Test City",
  "state": "Test State",
  "country": "Test Country",
  "pincode": "123456"
};

async function testCompanyCreation() {
  try {
    console.log('Testing company creation with admin token...');
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

testCompanyCreation();