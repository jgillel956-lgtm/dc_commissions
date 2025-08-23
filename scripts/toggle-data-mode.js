#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envLocalPath = path.join(__dirname, '..', '.env.local');
const envPath = path.join(__dirname, '..', '.env');

function updateEnvFile(filePath, enableMockData) {
  if (!fs.existsSync(filePath)) {
    console.log(`File ${filePath} does not exist. Creating it...`);
    fs.writeFileSync(filePath, '');
  }

  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update or add the REACT_APP_ENABLE_MOCK_DATA setting
  const mockDataRegex = /^REACT_APP_ENABLE_MOCK_DATA=.*$/m;
  const newSetting = `REACT_APP_ENABLE_MOCK_DATA=${enableMockData}`;
  
  if (mockDataRegex.test(content)) {
    content = content.replace(mockDataRegex, newSetting);
  } else {
    content += `\n${newSetting}`;
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath} with REACT_APP_ENABLE_MOCK_DATA=${enableMockData}`);
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  
  if (!mode || !['mock', 'zoho'].includes(mode)) {
    console.log('Usage: node scripts/toggle-data-mode.js [mock|zoho]');
    console.log('');
    console.log('Options:');
    console.log('  mock  - Use mock data (CSV files from data_tables/)');
    console.log('  zoho  - Use Zoho Analytics API');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/toggle-data-mode.js mock');
    console.log('  node scripts/toggle-data-mode.js zoho');
    process.exit(1);
  }
  
  const enableMockData = mode === 'mock';
  
  console.log(`Switching to ${mode} mode...`);
  console.log(`REACT_APP_ENABLE_MOCK_DATA will be set to ${enableMockData}`);
  console.log('');
  
  // Update both .env.local and .env files
  updateEnvFile(envLocalPath, enableMockData);
  updateEnvFile(envPath, enableMockData);
  
  console.log('');
  console.log('✅ Environment files updated successfully!');
  console.log('');
  console.log('Next steps:');
  console.log('1. Restart your development server: npm start');
  console.log('2. Check the connection status indicator in the header');
  console.log('');
  
  if (enableMockData) {
    console.log('📊 Mock Data Mode:');
    console.log('- Using CSV data from data_tables/ directory');
    console.log('- Changes will be stored in memory (reset on page refresh)');
    console.log('- No external API calls will be made');
  } else {
    console.log('🔗 Zoho Analytics Mode:');
    console.log('- Connecting to Zoho Analytics API');
    console.log('- Changes will be saved to your Zoho Analytics tables');
    console.log('- Requires valid Zoho Analytics credentials');
  }
}

main();
