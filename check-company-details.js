const mongoose = require('mongoose');

// MongoDB connection string (replace with your actual connection string)
const MONGODB_URI = 'mongodb+srv://proplex:proplex@cluster0.z61hlzq.mongodb.net/proplexDB';

// Company schema
const companySchema = new mongoose.Schema({
  name: String,
  registrationNumber: String,
  cinNumber: String,
  panNumber: String,
  gstNumber: String,
  email: String
});

const Company = mongoose.model('Company', companySchema);

async function checkCompanyDetails() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find companies with specific registration number
    const companies = await Company.find({ 
      $or: [
        { registrationNumber: "REG123456" },
        { name: "Test Company" },
        { email: "contact@company.com" }
      ]
    });
    
    console.log('Companies matching your payload:');
    companies.forEach((company, index) => {
      console.log(`${index + 1}. Name: ${company.name}`);
      console.log(`   Registration Number: ${company.registrationNumber}`);
      console.log(`   CIN Number: ${company.cinNumber || 'undefined/null'}`);
      console.log(`   PAN Number: ${company.panNumber || 'undefined/null'}`);
      console.log(`   GST Number: ${company.gstNumber || 'undefined/null'}`);
      console.log(`   Email: ${company.email}`);
      console.log('---');
    });
    
    if (companies.length === 0) {
      console.log('No companies found with matching registration number, name, or email');
    }
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkCompanyDetails();