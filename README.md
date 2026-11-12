# Mind Vault



### Your Knowledge. Your Memory. Always Available.



Mind Vault is an offline-first personal knowledge management platform designed to help users collect, organize, search and access their knowledge from anywhere, even without an internet connection.



It combines local-first storage, downloadable knowledge packs, intelligent search, AI-powered assistance and secure cloud synchronization in one application.



**Live Application:** https://mind-vault-iota-six.vercel.app/



---



## Features



### 1. Personal Knowledge Management

- Create, edit and delete personal notes.

- Organize notes using folders.

- Move notes between folders.

- Access your knowledge through a centralized library.



### 2. Offline-First Architecture

- Store notes and downloaded knowledge locally using IndexedDB.

- Access previously saved content without internet connectivity.

- Search local notes while offline.

- Automatically synchronize changes when connectivity returns.



### 3. Knowledge Packs

- Download curated knowledge packs.

- Read downloaded content offline.

- Track learning progress.

- Manage downloaded packs locally.



### 4. Intelligent Search

- Fast local full-text search.

- Multilingual semantic embeddings.

- Search across personal knowledge.

- Optimized search indexing.



### 5. AI Assistant

- AI-powered knowledge assistance using Groq.

- Context-aware retrieval from personal knowledge.

- Conversation-based interaction.

- Multilingual embedding support.



### 6. Synchronization and Conflict Management

- Synchronize local changes with the backend.

- Handle concurrent modifications using optimistic concurrency control.

- Detect synchronization conflicts.

- Resolve conflicts using local or server versions.

- Protect against duplicate synchronization operations.



### 7. Account Security

- JWT-based authentication.

- HttpOnly authentication cookies.

- Refresh-token rotation.

- Session versioning.

- Account-specific local databases.

- Protected API endpoints and rate limiting.



### 8. Progressive Web Application

- Responsive interface.

- Installable PWA.

- Offline application support.

- Optimized production bundles.



---



## Technology Stack



| Layer | Technologies |

|---|---|

| Frontend | React, TypeScript, Vite |

| Styling | Tailwind CSS |

| State Management | Zustand |

| Data Fetching | TanStack Query |

| Local Database | Dexie.js, IndexedDB |

| Search | MiniSearch |

| Routing | React Router |

| Validation | Zod |

| Backend | Node.js, Express, TypeScript |

| Database | MongoDB Atlas, Mongoose |

| Authentication | JWT, HttpOnly Cookies, bcrypt |

| AI | Groq |

| Embeddings | Hugging Face Transformers |

| Offline Support | PWA, Service Workers |

| Containerization | Docker, Docker Compose |

| CI/CD | GitHub Actions, Vercel, Render |



---



## Project Structure



```text

MindVault/

│

├── .github/

│   └── workflows/

│       └── ci.yml

│

├── client/

│   ├── public/

│   ├── src/

│   ├── Dockerfile

│   ├── nginx.conf

│   ├── package.json

│   └── vite.config.ts

│

├── server/

│   ├── public/

│   ├── src/

│   ├── tests/

│   ├── Dockerfile

│   ├── .dockerignore

│   ├── package.json

│   └── vitest.config.ts

│

├── docker-compose.yml

└── README.md

```



---



## Getting Started



### Prerequisites



Install the following:



- Node.js 24 or later

- npm

- Git

- Docker Desktop

- MongoDB Atlas account

- Groq API key



### Option 1: Run Using Docker Compose



Docker Compose is the recommended way to run the complete application locally.



**Step 1: Clone the repository**



```bash

git clone https://github.com/Abhisek-desk/MindVault.git



cd MindVault

```



**Step 2: Configure backend environment**



Create the Docker environment file:



```text

server/.env.docker

```



Configure the required variables:



```env

PORT=5000

NODE-ENV=production

CLIENT-URL=http://localhost:8080



MONGODB-URI=your-mongodb-connection-string



JWT-ACCESS-SECRET=your-access-secret

JWT-REFRESH-SECRET=your-refresh-secret



GROQ-API-KEY=your-groq-api-key

```



Use your own values. Never commit environment files or expose credentials.



**Step 3: Build and start the application**



```bash

docker compose up --build -d

```



**Step 4: Verify containers**



```bash

docker compose ps

```



**Step 5: Open the application**



Frontend:



http://localhost:8080



Backend health endpoint:



http://localhost:8080/api/v1/health



**Stop the application:**



```bash

docker compose down

```



The Hugging Face model cache is stored in a persistent Docker volume.



---



### Option 2: Run Frontend and Backend Separately



Install dependencies in both directories.



**Backend:**



```bash

cd server



npm ci



npm run dev

```



Configure the backend environment in `server/.env` before starting.



**Frontend:**



Open another terminal:



```bash

cd client



npm ci



npm run dev

```



Use the development URL printed by Vite.



---



## Environment Variables



The backend requires the following environment configuration:



| Variable | Description |

|---|---|

| `PORT` | Backend server port |

| `NODE-ENV` | Runtime environment |

| `CLIENT-URL` | Allowed frontend origin |

| `MONGODB-URI` | MongoDB connection string |

| `JWT-ACCESS-SECRET` | Access-token signing secret |

| `JWT-REFRESH-SECRET` | Refresh-token signing secret |

| `GROQ-API-KEY` | Groq API credential |

| `GROQ-MODEL` | AI model identifier |



Never publish actual credentials, JWT secrets or database connection strings.



---



## Development Commands



### Frontend



Run from `client/`:



| Command | Description |

|---|---|

| `npm run dev` | Start development server |

| `npm run build` | Build production frontend |

| `npm run lint` | Run ESLint |

| `npm test` | Run frontend tests |

| `npm run preview` | Preview production build |

| `npm run test:watch` | Run tests in watch mode |



### Backend



Run from `server/`:



| Command | Description |

|---|---|

| `npm run dev` | Start backend development server |

| `npm run build` | Compile TypeScript |

| `npm start` | Start production server |

| `npm test` | Run backend tests |

| `npm run test:watch` | Run tests in watch mode |



---



## Testing



Mind Vault includes automated frontend and backend tests.



The test suites cover areas such as:



- Authentication and session management.

- Notes and folders.

- Synchronization.

- Conflict resolution.

- Knowledge packs.

- AI validation and retrieval.

- Embedding services.

- Frontend API handling.

- Account isolation.



Run the frontend tests:



```bash

cd client



npm test

```



Run the backend tests:



```bash

cd server



npm test

```



---



## CI/CD Pipeline



Mind Vault uses GitHub Actions for continuous integration.



Workflow:



```text

        GitHub Push / Pull Request

                  |

                   v

           GitHub Actions CI

                   |

           +-------+-------+

           |               |

           v               v

        Backend         Frontend

        Tests            Tests

        Build            Lint

                         Build

           |               |

           +-------+-------+

                   |

                   v

              Docker Builds

                   |

           +-------+-------+

           |               |

           v               v

        Backend         Frontend

        Image            Image

                   |

                   v

           Deployment Checks

                   |

           +-------+-------+

           |               |

           v               v

         Render           Vercel

         Backend          Frontend

```



The GitHub Actions workflow is located at:



```text

.github/workflows/ci.yml

```



It runs backend tests, frontend linting and tests, production builds, and Docker image builds.



Production deployment checks are configured through the Vercel project settings. Render is configured to deploy after CI checks pass.



---



## Production Deployment



| Component | Platform |

|---|---|

| Frontend | Vercel |

| Backend | Render |

| Database | MongoDB Atlas |

| CI | GitHub Actions |

| Containerization | Docker |



**Live Application:**



https://mind-vault-iota-six.vercel.app/



---




## Production Monitoring

Mind Vault uses the following services for production monitoring:

| Service | What to Monitor | Where |
|---|---|---|
| Vercel | Deployment status and runtime errors | Vercel Dashboard |
| Render | Backend availability, deployment status and logs | Render Dashboard |
| MongoDB Atlas | Database availability, storage and metrics | MongoDB Atlas |
| GitHub Actions | CI workflow execution and build failures | GitHub Actions |

### Health Check Endpoints

Production backend:

https://mindvault-6ff3.onrender.com/api/v1/health

Health check through the frontend proxy:

https://mind-vault-iota-six.vercel.app/api/v1/health

Expected response:

```json
{
  "success": true,
  "message": "Mind Vault API is running"
}
```

An HTTP 200 response confirms that the health endpoint is responding. It does not independently verify every application dependency.

### Deployment Monitoring

After every production deployment:

1. Confirm backend tests and build pass.
2. Confirm frontend tests, linting and build pass.
3. Confirm Docker image builds pass.
4. Verify Render deployment reaches Live.
5. Verify Vercel production deployment reaches Ready.
6. Test the production website and backend health endpoints.

## Troubleshooting

| Problem | Recommended Action |
|---|---|
| Website unavailable | Check Vercel deployment status and logs. |
| API returns 5xx errors | Check Render service status and backend logs. |
| First API request is slow | Check whether the Render free instance is waking from inactivity. |
| Authentication fails | Check backend logs, cookie settings, CORS and production environment configuration. |
| Notes do not synchronize | Check connectivity, authentication and frontend sync status. |
| Knowledge pack download fails | Check the backend download endpoint and Render logs. |
| CI workflow fails | Inspect the failed job and step in GitHub Actions. |
| Automatic deployment does not start | Verify GitHub Actions checks and Render's After CI Checks Pass setting. |

Never publish environment variables, access tokens, JWT secrets, database credentials or private user data in logs or support requests.

## Backup and Recovery

### Database Backup

MongoDB Atlas hosts the production database.

Recommended precautions:

- Review backup options available for the current Atlas cluster and subscription.
- Enable automated backups when supported.
- Periodically create independent database backups.
- Store backups securely outside the application deployment.
- Restrict backup access to authorized administrators.

### Recovery Procedure

If database recovery is required:

1. Identify the most recent valid backup.
2. Verify the backup and recovery target.
3. Restore using MongoDB Atlas recovery tools or the appropriate MongoDB restore procedure.
4. Verify database collections and indexes.
5. Confirm backend connectivity.
6. Test authentication, notes, folders and synchronization.

Do not overwrite production data without confirming the recovery target.

### Local Data Considerations

Mind Vault stores offline data in browser IndexedDB.

Local browser data is separate from MongoDB Atlas backups. Unsynchronized changes may exist only on the user's device.

Users should synchronize pending changes whenever possible and avoid clearing browser storage unless local data has been recovered or is no longer needed.

## Security



Mind Vault implements several security measures:



- Password hashing with bcrypt.

- JWT authentication.

- HttpOnly cookies.

- Refresh-token rotation.

- Session versioning.

- Protected backend routes.

- API rate limiting.

- Request validation using Zod.

- Secure CORS configuration.

- Helmet security headers.

- Account-specific local databases.



Local IndexedDB data is not encrypted by default. Users should protect access to their devices.



---



## Offline Architecture



Mind Vault follows an offline-first design.



The local browser database acts as the primary workspace for personal notes and downloaded knowledge.



When the network becomes available:



1. Pending local changes are collected.

2. Changes are pushed to the backend.

3. Server changes are retrieved.

4. Version conflicts are detected.

5. Conflicts can be resolved by the user.



This approach allows users to continue working without depending on continuous internet connectivity.



---



## Future Improvements



Potential future enhancements include:



- Additional knowledge packs.

- Improved AI retrieval.

- More advanced learning analytics.

- Expanded multilingual capabilities.

- Enhanced synchronization diagnostics.

- Additional accessibility improvements.



---



## License



This project is currently developed as a college major project.



License terms can be added when distribution requirements are finalized.



---



**Mind Vault — Your Knowledge. Your Memory. Always Available.**

