const express = require('express');
const app = express();

// Mock the middleware and controllers to avoid dependency issues
jest.mock('./src/middleware/auth.middleware', () => ({
  authenticateJWT: (req, res, next) => next(),
  authorizeRoles: () => (req, res, next) => next()
}));

jest.mock('./src/controllers/admin.controller', () => ({
  adminLogin: (req, res) => res.send('Mock login'),
  adminRegister: (req, res) => res.send('Mock register')
}));

// Import the actual app
const serverApp = require('./dist/app');

// Function to extract routes from Express app
function getRoutes(app) {
  const routes = [];
  function processMiddleware(middleware, path = '') {
    if (middleware.name === 'router' && middleware.stack) {
      middleware.stack.forEach(layer => {
        if (layer.route) {
          layer.route.stack.forEach(stackItem => {
            routes.push({
              method: Object.keys(layer.route.methods)[0].toUpperCase(),
              path: path + layer.route.path,
              handler: stackItem.name || stackItem.handle.name || 'anonymous'
            });
          });
        } else if (layer.name === 'router' && layer.handle.stack) {
          processMiddleware(layer.handle, path + (layer.regexp.source !== '^\\/$' ? layer.regexp.source.replace(/\\\//g, '/').replace(/^\^|\$$/g, '') : ''));
        }
      });
    }
  }

  if (app._router && app._router.stack) {
    app._router.stack.forEach(layer => {
      if (layer.name === 'router') {
        processMiddleware(layer.handle, '');
      }
    });
  }

  return routes;
}

// Get all registered routes
const routes = getRoutes(serverApp);

console.log('Registered Routes:');
console.log('==================');
routes.forEach(route => {
  console.log(`${route.method} ${route.path} -> ${route.handler}`);
});

console.log('\nLooking specifically for admin routes...');
const adminRoutes = routes.filter(route => route.path.includes('/admin'));
if (adminRoutes.length > 0) {
  adminRoutes.forEach(route => {
    console.log(`${route.method} ${route.path} -> ${route.handler}`);
  });
} else {
  console.log('No admin routes found!');
}