# Fashion Ecommerce Platform Setup

## Prerequisites

- Node.js 18+ 
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

## Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration:**
   - Copy `.env.example` to `.env.local`
   - Update the environment variables with your values:
     ```bash
     cp .env.example .env.local
     ```

3. **Required Environment Variables:**
   - `MONGODB_URI`: MongoDB connection string
   - `MONGODB_DB_NAME`: Database name
   - `JWT_SECRET`: Secret key for JWT tokens (use a strong, random string)
   - `JWT_EXPIRES_IN`: Token expiration time (default: 7d)
   - `NEXTAUTH_SECRET`: NextAuth.js secret
   - `NEXTAUTH_URL`: Application URL

## Database Setup

### Option 1: Local MongoDB
1. Download and install MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Start MongoDB service:
   - Windows: MongoDB should start automatically as a service
   - macOS: `brew services start mongodb/brew/mongodb-community`
   - Linux: `sudo systemctl start mongod`

### Option 2: MongoDB Atlas (Cloud)
1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string and update `MONGODB_URI` in `.env.local`

## Testing the Setup

### Test Core Utilities (No Database Required)
```bash
npm run test:core
```

### Test Full Infrastructure (Requires MongoDB)
```bash
npm run test:infrastructure
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Project Structure

```
lib/
├── auth/           # Authentication utilities
│   ├── jwt.ts      # JWT token management
│   └── password.ts # Password hashing and validation
├── db/             # Database utilities
│   ├── connection.ts # MongoDB connection
│   └── config.ts   # Database configuration
└── index.ts        # Main exports

types/
└── index.ts        # TypeScript type definitions

scripts/
├── test-infrastructure.ts # Full infrastructure tests
└── test-core-utilities.ts # Core utilities tests
```

## Security Notes

- Always use strong, unique values for `JWT_SECRET` and `NEXTAUTH_SECRET`
- Never commit `.env.local` to version control
- Use environment-specific configurations for different deployment environments
- Regularly update dependencies to patch security vulnerabilities

## Next Steps

After completing the setup:
1. Verify all tests pass
2. Proceed to implement database models (Task 2.1)
3. Set up authentication system (Task 3.1)