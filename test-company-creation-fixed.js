const axios = require('axios');

// Replace with your actual admin token
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI2N2Y4Y2FkNjFkZDQxY2M4Y2Y2ZTQ0MCIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3MjgzNzY0MzksImV4cCI6MTcyODQ2MjgzOX0.0r8Y8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8X8';

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