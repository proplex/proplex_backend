// Simple test script to verify admin login functionality
const axios = require('axios');

const testAdminLogin = async () => {
  try {
    console.log('Testing admin login...');
    
    // Test valid credentials
    console.log('\n1. Testing with valid credentials:');
    const response1 = await axios.post('http://localhost:5000/api/admin/login', {
      email: 'proplex@gmail.com',
      password: 'Abcd@1234'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Token:', response1.data.token);
    console.log('User:', response1.data.user);
    
    // Test invalid credentials
    console.log('\n2. Testing with invalid credentials:');
    try {
      const response2 = await axios.post('http://localhost:5000/api/admin/login', {
        email: 'wrong@gmail.com',
        password: 'wrongpassword'
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Unexpected success with invalid credentials');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected invalid credentials');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test missing credentials
    console.log('\n3. Testing with missing credentials:');
    try {
      const response3 = await axios.post('http://localhost:5000/api/admin/login', {
        email: 'proplex@gmail.com'
        // missing password
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('❌ Unexpected success with missing credentials');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected missing credentials');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
  } catch (error) {
    console.log('❌ Login test failed!');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }
};

testAdminLogin();