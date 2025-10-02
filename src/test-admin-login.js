// Simple test script to demonstrate admin login functionality
// This script shows how to use the new admin login endpoint

const adminCredentials = {
  email: "proplex@gmail.com",
  password: "Abcd@1234"
};

console.log("Admin Login Test");
console.log("================");
console.log("To test the admin login functionality, make a POST request to:");
console.log("POST http://localhost:5000/api/auth/admin-login");
console.log("");
console.log("With the following JSON body:");
console.log(JSON.stringify(adminCredentials, null, 2));
console.log("");
console.log("Expected response:");
console.log("{");
console.log('  "success": true,');
console.log('  "token": "JWT_TOKEN_HERE",');
console.log('  "user": {');
console.log('    "id": "USER_ID",');
console.log('    "email": "proplex@gmail.com",');
console.log('    "firstName": "Admin",');
console.log('    "lastName": "User",');
console.log('    "role": "admin"');
console.log("  }");
console.log("}");
console.log("");
console.log("After login, use the token in the Authorization header for admin-only routes:");
console.log('Authorization: Bearer JWT_TOKEN_HERE');