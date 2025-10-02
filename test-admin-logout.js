const axios = require('axios');

// Test admin logout functionality
async function testAdminLogout() {
  try {
    console.log('Testing admin logout...');
    
    // First, login to get a token
    const loginResponse = await axios.post('http://localhost:3001/api/admin/login', {
      email: 'everythinggaurav48@gmail.com',
      password: 'Abcd@1234'
    });
    
    console.log('Login response:', loginResponse.data);
    
    const token = loginResponse.data.token;
    console.log('Received token:', token);
    
    // Now test logout with the token
    const logoutResponse = await axios.post('http://localhost:3001/api/admin/logout', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Logout response:', logoutResponse.data);
    
    if (logoutResponse.data.success) {
      console.log('✅ Admin logout test passed!');
    } else {
      console.log('❌ Admin logout test failed!');
    }
  } catch (error) {
    console.error('Error during test:', error.response ? error.response.data : error.message);
  }
}

testAdminLogout();