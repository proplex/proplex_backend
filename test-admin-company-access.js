const axios = require('axios');

// Test admin access to company routes
async function testAdminCompanyAccess() {
  try {
    console.log('Testing admin access to company routes...');
    
    // First, login as admin to get a token
    const loginResponse = await axios.post('http://localhost:3001/api/admin/login', {
      email: 'everythinggaurav48@gmail.com',
      password: 'Abcd@1234'
    });
    
    console.log('Admin login response:', loginResponse.data);
    
    const adminToken = loginResponse.data.token;
    console.log('Received admin token:', adminToken);
    
    // Test accessing company routes with admin token
    console.log('\n--- Testing GET /api/companies ---');
    try {
      const companiesResponse = await axios.get('http://localhost:3001/api/companies', {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('Companies response status:', companiesResponse.status);
      console.log('Companies response data:', companiesResponse.data);
      console.log('✅ Admin can access company routes!');
    } catch (error) {
      console.error('Error accessing companies:', error.response ? error.response.data : error.message);
    }
    
    // Test creating a company with admin token
    console.log('\n--- Testing POST /api/companies ---');
    try {
      const createCompanyData = {
        name: "Test Company from Admin",
        legalName: "Test Company Legal Name",
        registrationNumber: "TEST123456",
        website: "https://testcompany.com",
        description: "A test company created by admin",
        foundingDate: "2023-01-01",
        address: {
          street: "123 Test Street",
          city: "Test City",
          state: "Test State",
          country: "Test Country",
          postalCode: "12345"
        },
        contactEmail: "contact@testcompany.com",
        contactPhone: "+1234567890"
      };
      
      const createResponse = await axios.post('http://localhost:3001/api/companies', createCompanyData, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('Create company response status:', createResponse.status);
      console.log('Create company response data:', createResponse.data);
      console.log('✅ Admin can create companies!');
    } catch (error) {
      console.error('Error creating company:', error.response ? error.response.data : error.message);
    }
    
    // Test admin logout with admin token
    console.log('\n--- Testing POST /api/admin/logout ---');
    try {
      const logoutResponse = await axios.post('http://localhost:3001/api/admin/logout', {}, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      console.log('Logout response status:', logoutResponse.status);
      console.log('Logout response data:', logoutResponse.data);
      console.log('✅ Admin can logout successfully!');
    } catch (error) {
      console.error('Error logging out:', error.response ? error.response.data : error.message);
    }
    
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
  }
}

testAdminCompanyAccess();