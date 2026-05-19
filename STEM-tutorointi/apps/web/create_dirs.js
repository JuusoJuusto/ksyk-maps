const fs = require('fs');
const path = require('path');

const dirs = [
  'app/api/auth/login',
  'app/api/auth/register',
  'app/api/auth/refresh',
  'app/api/auth/logout',
  'app/api/auth/session',
  'app/api/auth/verify',
  'app/login',
  'app/register',
  'app/dashboard',
  'lib',
  'components'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created: ${fullPath}`);
  }
});

console.log('Done!');
