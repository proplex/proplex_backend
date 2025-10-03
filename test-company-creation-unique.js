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

// Company data to create - using unique values for all fields
const companyData = {
  "name": "proplex Rwa Unique " + Date.now(),  // Make it unique with timestamp
  "industry": "Blockchain",
  "incorporationType": "private_limited",
  "jurisdiction": "USA",
  "registrationNumber": "REG" + Date.now(),  // Make it unique with timestamp
  "cinNumber": "CIN" + Date.now(),  // Make it unique with timestamp
  "panNumber": "PAN" + Date.now(),  // Make it unique with timestamp
  "gstNumber": "GST" + Date.now(),  // Make it unique with timestamp
  "email": "proplex" + Date.now() + "@company.com",  // Make it unique with timestamp
  "phone": "+1234567890",
  "address": "123 Main Street",
  "city": "City Name",
  "state": "State Name",
  "country": "Country Name",
  "pincode": "123056"  // Fixed to 6 digits
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