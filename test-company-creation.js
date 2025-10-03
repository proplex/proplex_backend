const axios = require('axios');

// Test company creation with admin token
async function testCompanyCreation() {
  try {
    console.log('Testing company creation with admin token...');
    
    // First, login as admin to get a token
    const loginResponse = await axios.post('http://localhost:3001/api/admin/login', {
      email: 'everythinggaurav48@gmail.com',
      password: 'Abcd@1234'
    });
    
    console.log('Admin login response status:', loginResponse.status);
    console.log('Admin login response data:', loginResponse.data);
    
    const adminToken = loginResponse.data.token;
    console.log('Received admin token length:', adminToken ? adminToken.length : 'null');
    
    // Test creating a company with admin token
    console.log('\n--- Testing POST /api/companies ---');
    try {
      const createCompanyData = {
        name: "Test Company",
        industry: "Technology",
        incorporationType: "private_limited",
        jurisdiction: "India",
        registrationNumber: "TEST123456",
        email: "contact@testcompany.com",
        phone: "+1234567890",
        address: "123 Test Street",
        city: "Test City",
        state: "Test State",
        country: "Test Country",
        pincode: "123456"
      };
      
      console.log('Sending company data:', JSON.stringify(createCompanyData, null, 2));
      
      const createResponse = await axios.post('http://localhost:3001/api/companies', createCompanyData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Create company response status:', createResponse.status);
      console.log('Create company response data:', JSON.stringify(createResponse.data, null, 2));
      console.log('✅ Company created successfully!');
    } catch (error) {
      console.error('Error creating company:', error.response ? {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers
      } : error.message);
    }
    
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
  }
}

testCompanyCreation();