# SyncBoard - Collaborative Team Management Application

SyncBoard is a comprehensive team management application designed to streamline communication and project coordination, with enhanced user experience and interactive UI elements.

## Features

- User authentication and profile management
- Team creation and management
- Real-time chat and messaging
- File sharing and document collaboration
- Calendar events and scheduling
- Coding environment for collaborative development
- Task management and tracking
- Interactive UI with micro-interactions and animations

## Quick Start Guide

### Main Directory and Commands

All commands should be run from the `SyncBoard` directory:

```bash
cd /path/to/SyncBoard
```

### Quick Setup (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Create and setup the database (if using PostgreSQL locally)
createdb syncboard

# 3. Push schema to database
npm run db:push

# 4. Seed the database with sample data
npx tsx scripts/seed-db.ts

# 5. Start the development server
npm run dev
```

The application will be available at `http://localhost:5000`

### Login Credentials

After seeding the database, you can log in with these credentials:

**Super Admin:**
- Username: `SyncBoard`
- Password: `hush@syncB123`

**Test User:**
- Username: `testuser`
- Password: `password123`

**Other Sample Users:**
- Admin: `admin` / `adminpass`
- Teacher: `teacher` / `teacherpass`
- Students: `student1` / `student1pass`, `student2` / `student2pass`

## Detailed Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd SyncBoard
```

### 2. Environment Configuration

We've provided an example configuration file `.env.local.example` that you can use as a template. Create a `.env` file in the root directory by copying this example:

```bash
# Copy the example file
cp .env.local.example .env

# Then edit the file to set your local values
nano .env  # or use any text editor
```

The contents of your `.env` file should look like this:

```
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/syncboard

# Session Configuration
SESSION_SECRET=your-session-secret

# For local development
NODE_ENV=development

# Dummy values for local development (not actually used)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=local-development-key
```

Make sure to replace `username` and `password` with your actual PostgreSQL credentials.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

#### Option 1: Local PostgreSQL Setup via Command Line

```bash
# Create database
createdb syncboard

# Push schema to database
npm run db:push

# Seed database with sample data
npx tsx scripts/seed-db.ts
```

#### Option 2: PostgreSQL Setup with pgAdmin

1. **Install and Launch pgAdmin**:
   - Download and install pgAdmin from [https://www.pgadmin.org/download/](https://www.pgadmin.org/download/)
   - Launch pgAdmin application

2. **Register a New Server (if not already done)**:
   - Right-click on "Servers" in the left panel and select "Register > Server..."
   - In the "General" tab, give your server a name (e.g., "Local PostgreSQL")
   - In the "Connection" tab, enter:
     - Host: `localhost` (or `127.0.0.1`)
     - Port: `5432` (default PostgreSQL port)
     - Maintenance database: `postgres` (default)
     - Username: your PostgreSQL username (often your system username)
     - Password: your PostgreSQL password (if set)
   - Click "Save"

3. **Create a New Database**:
   - Expand your server in the left panel
   - Right-click on "Databases" and select "Create > Database..."
   - Enter database name: `syncboard`
   - Set owner to your PostgreSQL user
   - Click "Save"

4. **Update Your .env File**:
   - Ensure your `.env` file has the correct DATABASE_URL:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/syncboard
   ```
   - Replace `username` and `password` with your actual PostgreSQL credentials

5. **Push Schema and Seed Data**:
   ```bash
   # Push schema to database
   npm run db:push

   # Seed database with sample data
   npx tsx scripts/seed-db.ts
   ```

#### Production Database Setup

For production environments, you need to configure a PostgreSQL database that's accessible from your production server:

1. **Option A: Self-Hosted PostgreSQL**:
   - Install PostgreSQL on your production server
   - Configure PostgreSQL to accept external connections (if needed)
   - Create a production database with a secure username/password
   - Update the production `.env` file with the production database URL

2. **Option B: Cloud-Hosted PostgreSQL (Recommended)**:
   - Sign up for a managed PostgreSQL service like:
     - [Neon](https://neon.tech) (Serverless PostgreSQL)
     - [Supabase](https://supabase.com) (PostgreSQL with additional features)
     - [Railway](https://railway.app) (Simple deployment platform with PostgreSQL)
     - [Amazon RDS](https://aws.amazon.com/rds/postgresql/)
     - [Google Cloud SQL](https://cloud.google.com/sql/docs/postgres)
   - Create a PostgreSQL database instance
   - Obtain the connection string in the format:
     ```
     postgresql://username:password@hostname:port/database?sslmode=require
     ```
   - Set this as the `DATABASE_URL` in your production environment variables

3. **SSL Configuration (Important for Production)**:
   - Most cloud providers require SSL connections
   - Ensure your connection string includes `?sslmode=require` parameter
   - Our application's database connection is configured to support SSL by default

### 5. Run the Application

```bash
# Start development server
npm run dev
```

## Main Code Files

- **Server Entry Point**: `server/index.ts` - The main server file that starts the Express application
- **Client Entry Point**: `client/src/main.tsx` - The main React application entry point
- **Database Schema**: `shared/schema.ts` - Contains all database table definitions and relationships
- **Core Application Logic**:
  - `server/routes.ts` - API routes and WebSocket server
  - `server/auth.ts` - Authentication logic
  - `client/src/App.tsx` - Main React application component with routing

## Project Structure

```
SyncBoard/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions and constants
│   │   ├── pages/           # Page components
│   │   ├── App.tsx          # Main App component
│   │   └── main.tsx         # Entry point
├── server/                  # Backend Express server
│   ├── auth.ts              # Authentication logic
│   ├── db.ts                # Database connection
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes
│   ├── session.ts           # Session management
│   ├── storage.ts           # Database operations
│   └── vite.ts              # Vite integration
├── scripts/                 # Utility scripts
│   └── seed-db.ts           # Database seeding script
├── shared/                  # Shared code between client and server
│   └── schema.ts            # Database schema definitions
├── .env                     # Environment variables
├── drizzle.config.ts        # Drizzle ORM configuration
├── package.json             # Project dependencies
├── tsconfig.json            # TypeScript configuration
└── vite.config.ts           # Vite configuration
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run check` | Run TypeScript type checking |
| `npm run db:push` | Push schema changes to database |
| `npx tsx scripts/seed-db.ts` | Seed database with sample data |

## Database Schema Management

- Database schema is defined in `shared/schema.ts` using Drizzle ORM
- To modify database schema:
  1. Update `shared/schema.ts` with new models and relations
  2. Update `server/storage.ts` to include any new queries
  3. Run `npm run db:push` to apply changes to the database

## Authentication

The application supports two authentication methods:
1. **Local Authentication**: Username/password via Passport.js
2. **Supabase Authentication**: For production, but disabled in local development

## Troubleshooting

### Database Connection Issues

- Verify that the `DATABASE_URL` in your `.env` file is correct
- Ensure your PostgreSQL server is running
- Check if your database user has the necessary permissions
- Verify PostgreSQL is installed and running: `pg_isready`

### Build or Development Server Issues

- Clear node_modules and reinstall dependencies: 
  ```bash
  rm -rf node_modules
  npm install
  ```
- Check for TypeScript errors: 
  ```bash
  npm run check
  ```

## License

MIT