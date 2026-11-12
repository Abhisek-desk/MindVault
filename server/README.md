Mind Vault Backend
The backend API for Mind Vault, an offline-first personal knowledge management platform.
Technology
- Node.js 24
- Express 5
- TypeScript
- MongoDB Atlas and Mongoose
- JWT authentication with HttpOnly cookies
- Zod validation
- Groq AI
- Hugging Face Transformers
Requirements
- Node.js 24 or later
- npm
- MongoDB Atlas connection
- Groq API key
Environment Configuration
Create a .env file in the server directory.

Required variables:
- PORT
- NODE_ENV
- CLIENT_URL
- MONGODB_URI
- JWT_ACCESS_SECRET
- JWT_REFRESH_SECRET
- GROQ_API_KEY
- GROQ_MODEL
Never commit environment files or expose credentials.
Installation
Run npm ci.
Development
Run npm run dev.
Production
Build using npm run build.

Start using npm start.
Testing
Run npm test.
Additional Commands
- npm run seed:packs
- npm run backfill:embeddings
- npm run backfill:versions
Docker
Build the backend image using docker compose build mindvault-api.

Start the application using docker compose up -d.
Health Check
API endpoint: /api/v1/health
Security
The backend implements password hashing, JWT session versioning, refresh-token rotation, rate limiting, request validation, protected routes and secure cookie handling.
Deployment
- Backend hosting: Render
- Database hosting: MongoDB Atlas
CI/CD: GitHub Actions validates changes before production deployment.
