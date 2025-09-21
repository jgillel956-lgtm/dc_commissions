import { query } from '../api/db/connection.mjs';

async function testDatabaseSchema() {
  console.log('🔍 Testing database schema...');
  
  const tables = [
    'company_upcharge_fees_DC',
    'employee_commissions_DC',
    'insurance_companies_DC',
    'monthly_interchange_income_DC',
    'monthly_interest_revenue_DC',
    'payment_modalities',
    'referral_partners_DC',
    'revenue_master_view_cache'
  ];
  
  for (const tableName of tables) {
    try {
      const result = await query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`✅ ${tableName}: ${result.rows[0].count} records`);
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
    }
  }
  
  console.log('🎉 Database schema test completed!');
}

testDatabaseSchema().catch(console.error);


