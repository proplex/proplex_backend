// Simple test script to check if admin routes are working
const express = require('express');
const app = express();

// Mock the validateRequest middleware
const validateRequest = (req, res, next) => next();

// Create a simple mock of the admin controller functions
const adminLogin = (req, res) => {
  res.json({ message: 'Admin login endpoint' });
};

const adminRegister = (req, res) => {
  res.json({ message: 'Admin register endpoint' });
};

// Create admin routes manually for testing
const adminRouter = express.Router();

// Admin login route
adminRouter.post('/login', adminLogin);

// Admin register route
adminRouter.post('/register', adminRegister);

// Use the admin routes
app.use('/api/admin', adminRouter);

// Add a simple test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

// Get all registered routes
function getRoutes(app) {
  const routes = [];
  
  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.route) {
        const route = layer.route;
        Object.keys(route.methods).forEach(method => {
          routes.push({
            method: method.toUpperCase(),
            path: route.path
          });
        });
      } else if (layer.name === 'router' && layer.handle.stack) {
        const basePath = layer.regexp.source.replace(/\\/g, '').replace(/^\^|\$$/g, '').replace(/\(\/\?\)/g, '');
        layer.handle.stack.forEach(subLayer => {
          if (subLayer.route) {
            const route = subLayer.route;
            Object.keys(route.methods).forEach(method => {
              routes.push({
                method: method.toUpperCase(),
                path: basePath + route.path
              });
            });
          }
        });
      }
    });
  }
  
  return routes;
}

// Check what routes are registered
const routes = getRoutes(app);

console.log('All registered routes:');
routes.forEach(route => {
  console.log(`${route.method} ${route.path}`);
});

console.log('\nAdmin routes specifically:');
const adminRoutesList = routes.filter(route => route.path.includes('/admin'));
adminRoutesList.forEach(route => {
  console.log(`${route.method} ${route.path}`);
});

// Start a test server
const port = 3001;
app.listen(port, () => {
  console.log(`\nTest server running on port ${port}`);
  console.log('Try accessing:');
  console.log(`  GET  http://localhost:${port}/test`);
  console.log(`  POST http://localhost:${port}/api/admin/login`);
  console.log(`  POST http://localhost:${port}/api/admin/register`);
});