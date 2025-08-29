const axios = require('axios');

async function listZohoTables() {
  console.log('🔍 Listing Zoho Analytics Tables...\n');

  try {
    // Test the tables endpoint
    const response = await axios.get('https://dc-commissions-on3mmywrx-skipgilleland-disburseclous-projects.vercel.app/api/zoho-analytics.mjs?action=tables');
    
    console.log('✅ Tables response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.tables) {
      console.log('\n📋 Available Tables:');
      response.data.tables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.name} (${table.records || 0} records)`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing tables:', error.response?.data || error.message);
  }
}

listZohoTables();
