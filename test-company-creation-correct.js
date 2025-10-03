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

// Company data to create - using the correct format for the service
const companyData = {
  "name": "Company Name",
  "industry": "Technology",  // This was missing
  "incorporationType": "private_limited",  // This was missing
  "jurisdiction": "USA",  // This was missing
  "registrationNumber": "REG123456",
  "taxId": "TAX123456",
  "website": "https://companywebsite.com",
  "description": "Company description",
  "foundingDate": "2020-01-01",
  "address": {
    "street": "123 Main Street",
    "city": "City Name",
    "state": "State Name",
    "country": "Country Name",
    "postalCode": "12345",
    "coordinates": [-73.9857, 40.7484]
  },
  "contactEmail": "contact@company.com",
  "contactPhone": "+1234567890",
  "logo": "https://companywebsite.com/logo.png",
  "status": "active"
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