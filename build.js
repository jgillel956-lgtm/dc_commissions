const { execSync } = require('child_process');

// Set CI to false to prevent warnings from being treated as errors
process.env.CI = 'false';

console.log('Building with CI=false...');
execSync('react-scripts build', { stdio: 'inherit' });
