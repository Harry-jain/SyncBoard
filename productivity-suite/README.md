# Productivity Suite

A comprehensive productivity suite with cloud storage and collaboration tools, featuring Google, Microsoft, Apple, and phone number authentication with optional 2FA.

## Features

### Authentication
- **Multiple Sign-in Options**: Google, Microsoft, Apple, Phone Number, and Email/Password
- **Email Verification**: Automatic email verification for new accounts
- **Two-Factor Authentication (2FA)**: Optional 2FA via email codes
- **Secure Session Management**: JWT-based sessions with NextAuth.js

### Productivity Apps
- **Documents**: Rich text editor for creating and editing documents
- **Spreadsheets**: Full-featured spreadsheet editor with formulas
- **Presentations**: Create and present slides with presentation mode
- **Forms**: Build custom forms with various field types
- **Notebook**: Note-taking app with tags and search functionality

### Cloud Storage
- **5GB Free Storage**: Each user gets 5GB of cloud storage
- **File Management**: Organize files in folders
- **Real-time Sync**: Files sync across all devices
- **Storage Monitoring**: Track storage usage and limits

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js
- **UI Components**: Radix UI, Lucide React
- **Email**: Nodemailer

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd productivity-suite
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Configure your environment variables in `.env.local`:
```env
# Database
DATABASE_URL="file:./dev.db"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# OAuth Providers (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

APPLE_CLIENT_ID="your-apple-client-id"
APPLE_CLIENT_SECRET="your-apple-client-secret"

# Email Configuration
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="your-email@gmail.com"

# Twilio for SMS (optional)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"
```

5. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URI: `http://localhost:3000/api/auth/callback/microsoft`
4. Generate client secret

### Apple OAuth
1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Create a new app identifier
3. Configure Sign in with Apple
4. Add redirect URI: `http://localhost:3000/api/auth/callback/apple`

## Email Configuration

For email verification and 2FA, configure your SMTP settings:

### Gmail
1. Enable 2-factor authentication
2. Generate an app password
3. Use your Gmail address and app password in the environment variables

### Other Providers
Update the SMTP settings in `.env.local` for your email provider.

## Database Schema

The application uses the following main models:

- **User**: User accounts with authentication and storage info
- **Account**: OAuth account connections
- **Session**: User sessions
- **File**: Files stored in the cloud
- **Folder**: File organization
- **VerificationToken**: Email verification tokens

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `GET /api/auth/verify-email` - Verify email address
- `POST /api/auth/2fa/send-code` - Send 2FA code

### Drive
- `GET /api/drive/files` - Get user files
- `POST /api/drive/files` - Create new file
- `GET /api/drive/folders` - Get user folders
- `POST /api/drive/folders` - Create new folder

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Other Platforms
1. Build the application: `npm run build`
2. Start production server: `npm start`
3. Set up your database (PostgreSQL recommended for production)
4. Configure environment variables

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, email support@productivitysuite.com or create an issue in the repository.