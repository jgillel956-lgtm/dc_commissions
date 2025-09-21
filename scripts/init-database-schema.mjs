import { query } from '../api/db/connection.mjs';
import fs from 'fs';
import path from 'path';

async function initDatabaseSchema() {
  console.log('🔧 Initializing database schema...');
  
  try {
    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'api', 'db', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf-8');
    
    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Some statements might fail if tables already exist, which is OK
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`⚠️ Statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Database schema initialization completed!');
    
    // Test the tables
    console.log('🔍 Testing tables...');
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
    
  } catch (error) {
    console.error('❌ Database schema initialization failed:', error);
    throw error;
  }
}

initDatabaseSchema().catch(console.error);


