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

async function checkExistingCompanies() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all companies
    const companies = await Company.find({}, 'name registrationNumber cinNumber panNumber gstNumber email');
    
    console.log('Existing companies in the database:');
    companies.forEach((company, index) => {
      console.log(`${index + 1}. Name: ${company.name}`);
      console.log(`   Registration Number: ${company.registrationNumber}`);
      console.log(`   CIN Number: ${company.cinNumber || 'N/A'}`);
      console.log(`   PAN Number: ${company.panNumber || 'N/A'}`);
      console.log(`   GST Number: ${company.gstNumber || 'N/A'}`);
      console.log(`   Email: ${company.email}`);
      console.log('---');
    });
    
    console.log(`Total companies found: ${companies.length}`);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkExistingCompanies();