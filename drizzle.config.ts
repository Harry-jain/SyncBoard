import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set, ensure the database is provisioned");
}

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';

// Check if SSL is explicitly required in the connection string
const sslRequired = process.env.DATABASE_URL.includes('sslmode=require');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    // Use SSL in production or when explicitly required in connection string
    ssl: isProduction || sslRequired
  }
});
