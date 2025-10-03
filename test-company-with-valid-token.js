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

console.log('Generated admin token:', ADMIN_TOKEN);
console.log('Decoded payload:', adminPayload);

// Company data to create
const companyData = {
  name: 'Test Company',
  legalName: 'Test Company Legal Name',
  registrationNumber: 'REG123456',
  taxId: 'TAX123456',
  website: 'https://testcompany.com',
  description: 'A test company for verification',
  foundingDate: '2020-01-01',
  address: {
    street: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
    coordinates: [0, 0]
  },
  contactEmail: 'contact@testcompany.com',
  contactPhone: '+1234567890',
  logo: 'https://testcompany.com/logo.png',
  status: 'active'
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
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Error creating company:', error.response?.data || error.message);
  }
}

testCompanyCreation();