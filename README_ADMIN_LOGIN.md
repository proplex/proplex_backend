# Admin Login and Registration

## Overview
This document explains how to use the admin login and registration functionality in the ProPlex backend.

## Admin Credentials
- Email: everythinggaurav48@gmail.com
- Password: Abcd@1234

## Endpoints

### Admin Registration
Registers the admin user in the database.

**Endpoint:** `POST /api/admin/register`

**Request Body:**
```json
{
  "email": "everythinggaurav48@gmail.com",
  "password": "Abcd@1234"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Admin user created/updated successfully",
  "user": {
    "id": "user_id",
    "email": "everythinggaurav48@gmail.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

### Admin Login
Authenticates the admin user and returns a JWT token.

**Endpoint:** `POST /api/admin/login`

**Request Body:**
```json
{
  "email": "everythinggaurav48@gmail.com",
  "password": "Abcd@1234"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "everythinggaurav48@gmail.com",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }
}
```

### Admin Logout
Logs out the admin user by invalidating the JWT token.

**Endpoint:** `POST /api/admin/logout`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully logged out"
}
```

## Testing the Endpoints

### Using curl

1. **Register Admin User:**
```bash
curl -X POST http://localhost:3001/api/admin/register \
  -H "Content-Type: application/json" \
  -d '{"email":"everythinggaurav48@gmail.com","password":"Abcd@1234"}'
```

2. **Login as Admin:**
```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"everythinggaurav48@gmail.com","password":"Abcd@1234"}'
```

3. **Logout as Admin:**
```bash
curl -X POST http://localhost:3001/api/admin/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Using Postman

1. **Register Admin User:**
   - Method: POST
   - URL: http://localhost:3001/api/admin/register
   - Headers: Content-Type: application/json
   - Body (raw JSON):
   ```json
   {
     "email": "everythinggaurav48@gmail.com",
     "password": "Abcd@1234"
   }
   ```

2. **Login as Admin:**
   - Method: POST
   - URL: http://localhost:3001/api/admin/login
   - Headers: Content-Type: application/json
   - Body (raw JSON):
   ```json
   {
     "email": "everythinggaurav48@gmail.com",
     "password": "Abcd@1234"
   }
   ```

3. **Logout as Admin:**
   - Method: POST
   - URL: http://localhost:3001/api/admin/logout
   - Headers: 
     - Content-Type: application/json
     - Authorization: Bearer <your_jwt_token>

## Troubleshooting

### Route Not Found Issues

If you're getting "route not found" errors, it's likely due to path alias resolution issues in the compiled code. To test the functionality:

1. Ensure the server is running with `npm run dev` or `npm start`
2. Check that the routes are properly registered in [src/app.ts](file:///d:/HACKATHON/proplex-Project/proplex-backend/proplex_backend/src/app.ts)
3. Verify the route files are correctly imported

### Database Connection Issues

If you see database connection errors, make sure:
1. Your MongoDB connection string is correct in the `.env` file
2. The MongoDB service is running and accessible
3. The database credentials are correct

## Implementation Details

The admin functionality is implemented in:
- Controller: `src/controllers/admin.controller.ts`
- Routes: `src/routes/admin.routes.ts`
- JWT utilities: `src/utils/jwt.ts`

The admin user is created in the database during registration but authentication can work with the fixed credentials even without database connectivity.

## Testing with the Debug Script

You can also use the test scripts we created:

1. Run the test server:
```bash
npm run dev
```

2. Test the registration:
```bash
node test-admin-register.js
```

3. Test the login:
```bash
node test-admin-login.js
```

4. Test the logout:
```bash
node test-admin-logout.js
```