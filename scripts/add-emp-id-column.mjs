import { query } from '../api/db/connection.mjs';

async function addEmpIdColumn() {
  console.log('🔧 Adding emp_id column to revenue_master_view_cache table...');
  
  try {
    // Check if the column already exists
    const columnCheck = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'revenue_master_view_cache' 
      AND column_name = 'emp_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ emp_id column already exists in revenue_master_view_cache table');
      return;
    }
    
    // Add the emp_id column
    console.log('📝 Adding emp_id column...');
    await query(`
      ALTER TABLE revenue_master_view_cache 
      ADD COLUMN emp_id INTEGER
    `);
    
    // Add index for the new column
    console.log('📝 Adding index for emp_id column...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_revenue_cache_emp_id 
      ON revenue_master_view_cache(emp_id)
    `);
    
    console.log('✅ Successfully added emp_id column and index to revenue_master_view_cache table');
    
  } catch (error) {
    console.error('❌ Failed to add emp_id column:', error.message);
    throw error;
  }
}

// Run the migration
addEmpIdColumn()
  .then(() => {
    console.log('🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });


