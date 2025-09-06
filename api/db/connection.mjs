import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // Add connection resilience settings
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error if connection takes longer than 2 seconds
  maxUses: 7500, // Close connections after they've been used a certain number of times
});

// Enhanced query function with retry logic
export const query = async (text, params, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error(`Database query attempt ${attempt} failed:`, error.message);
      
      // Check if it's a connection error that we should retry
      if (error.code === '08006' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        if (attempt === retries) {
          console.error('All database retry attempts exhausted');
          throw error;
        }
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      
      // For non-connection errors, don't retry
      throw error;
    }
  }
};

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

export { pool };
