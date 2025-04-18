/**
 * Apply database migrations for SyncBoard
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Environment variables should be loaded by the Node.js runtime

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const DATABASE_URL = process.env.DATABASE_URL as string;

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Configure connection options based on environment
const connectionOptions: postgres.Options<any> = { 
  max: 1 
};

// Add SSL configuration for production environments
if (isProduction) {
  connectionOptions.ssl = {
    rejectUnauthorized: false // Needed for some cloud database providers
  };
} else {
  // In development, use SSL only if explicitly required by the connection string
  const sslRequired = DATABASE_URL.includes('sslmode=require');
  if (sslRequired) {
    connectionOptions.ssl = {
      rejectUnauthorized: false
    };
  }
}

async function main() {
  console.log(`Running database migrations in ${isProduction ? 'production' : 'development'} mode...`);
  
  try {
    // Use postgres.js for migrations with the configured options
    const migrationClient = postgres(DATABASE_URL, connectionOptions);
    const db = drizzle(migrationClient);
    
    // Run migrations from the specified directory
    await migrate(db, { migrationsFolder: "migrations" });
    
    console.log("Migrations completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();