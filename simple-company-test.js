const jwt = require('jsonwebtoken');
const axios = require('axios');

// Generate a valid admin token
const JWT_SECRET = 'proplex_jwt_secret';
const adminPayload = {
  id: 'b67f8cad61dd41cc8cf6e440',
  email: 'admin@example.com',
  role: 'admin'
};

const ADMIN_TOKEN = jwt.sign(adminPayload, JWT_SECRET, { expiresIn: '1d' });

console.log('Generated admin token');

// Company data to create - using the correct format for the new API
const companyData = {
  name: 'Test Company',
  industry: 'Technology',
  incorporationType: 'private_limited',
  jurisdiction: 'India',
  registrationNumber: 'REG123456',
  email: 'contact@testcompany.com',
  phone: '+1234567890',
  address: '123 Test Street',
  city: 'Test City',
  state: 'Test State',
  country: 'Test Country',
  pincode: '123456'
};

async function testCompanyCreation() {
  try {
    console.log('Testing company creation with admin token...');
    
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