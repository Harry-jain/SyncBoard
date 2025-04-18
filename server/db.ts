import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if we're in production or development mode
const isProduction = process.env.NODE_ENV === 'production';

// Connection configuration options
const connectionOptions: postgres.Options<any> = {
  max: 10, // Maximum number of connections in the pool
};

// Add SSL configuration for production environments (cloud hosting services)
if (isProduction) {
  connectionOptions.ssl = {
    rejectUnauthorized: false // Needed for some cloud database providers
  };
} else {
  // In development, use SSL only if explicitly required by the connection string
  const sslRequired = process.env.DATABASE_URL?.includes('sslmode=require');
  if (sslRequired) {
    connectionOptions.ssl = {
      rejectUnauthorized: false
    };
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection
const client = postgres(process.env.DATABASE_URL, connectionOptions);

// Create a drizzle instance
export const db = drizzle(client);

console.log(`Database connection established in ${isProduction ? 'production' : 'development'} mode`);