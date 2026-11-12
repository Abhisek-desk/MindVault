\# Mind Vault



\### Your Knowledge. Your Memory. Always Available.



Mind Vault is an offline-first personal knowledge management platform designed to help users collect, organize, search and access their knowledge from anywhere, even without an internet connection.



It combines local-first storage, downloadable knowledge packs, intelligent search, AI-powered assistance and secure cloud synchronization in one application.



\*\*Live Application:\*\* https://mind-vault-iota-six.vercel.app/



\---



\## Features



\### 1. Personal Knowledge Management

\- Create, edit and delete personal notes.

\- Organize notes using folders.

\- Move notes between folders.

\- Access your knowledge through a centralized library.



\### 2. Offline-First Architecture

\- Store notes and downloaded knowledge locally using IndexedDB.

\- Access previously saved content without internet connectivity.

\- Search local notes while offline.

\- Automatically synchronize changes when connectivity returns.



\### 3. Knowledge Packs

\- Download curated knowledge packs.

\- Read downloaded content offline.

\- Track learning progress.

\- Manage downloaded packs locally.



\### 4. Intelligent Search

\- Fast local full-text search.

\- Multilingual semantic embeddings.

\- Search across personal knowledge.

\- Optimized search indexing.



\### 5. AI Assistant

\- AI-powered knowledge assistance using Groq.

\- Context-aware retrieval from personal knowledge.

\- Conversation-based interaction.

\- Multilingual embedding support.



\### 6. Synchronization and Conflict Management

\- Synchronize local changes with the backend.

\- Handle concurrent modifications using optimistic concurrency control.

\- Detect synchronization conflicts.

\- Resolve conflicts using local or server versions.

\- Protect against duplicate synchronization operations.



\### 7. Account Security

\- JWT-based authentication.

\- HttpOnly authentication cookies.

\- Refresh-token rotation.

\- Session versioning.

\- Account-specific local databases.

\- Protected API endpoints and rate limiting.



\### 8. Progressive Web Application

\- Responsive interface.

\- Installable PWA.

\- Offline application support.

\- Optimized production bundles.



\---



\## Technology Stack



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



\---



\## Project Structure



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



\---



\## Getting Started



\### Prerequisites



Install the following:



\- Node.js 24 or later

\- npm

\- Git

\- Docker Desktop

\- MongoDB Atlas account

\- Groq API key



\### Option 1: Run Using Docker Compose



Docker Compose is the recommended way to run the complete application locally.



\*\*Step 1: Clone the repository\*\*



```bash

git clone https://github.com/Abhisek-desk/MindVault.git



cd MindVault

```



\*\*Step 2: Configure backend environment\*\*



Create the Docker environment file:



```text

server/.env.docker

```



Configure the required variables:



```env

PORT=5000

NODE\_ENV=production

CLIENT\_URL=http://localhost:8080



MONGODB\_URI=your\_mongodb\_connection\_string



JWT\_ACCESS\_SECRET=your\_access\_secret

JWT\_REFRESH\_SECRET=your\_refresh\_secret



GROQ\_API\_KEY=your\_groq\_api\_key

```



Use your own values. Never commit environment files or expose credentials.



\*\*Step 3: Build and start the application\*\*



```bash

docker compose up --build -d

```



\*\*Step 4: Verify containers\*\*



```bash

docker compose ps

```



\*\*Step 5: Open the application\*\*



Frontend:



http://localhost:8080



Backend health endpoint:



http://localhost:8080/api/v1/health



\*\*Stop the application:\*\*



```bash

docker compose down

```



The Hugging Face model cache is stored in a persistent Docker volume.



\---



\### Option 2: Run Frontend and Backend Separately



Install dependencies in both directories.



\*\*Backend:\*\*



```bash

cd server



npm ci



npm run dev

```



Configure the backend environment in `server/.env` before starting.



\*\*Frontend:\*\*



Open another terminal:



```bash

cd client



npm ci



npm run dev

```



Use the development URL printed by Vite.



\---



\## Environment Variables



The backend requires the following environment configuration:



| Variable | Description |

|---|---|

| `PORT` | Backend server port |

| `NODE\_ENV` | Runtime environment |

| `CLIENT\_URL` | Allowed frontend origin |

| `MONGODB\_URI` | MongoDB connection string |

| `JWT\_ACCESS\_SECRET` | Access-token signing secret |

| `JWT\_REFRESH\_SECRET` | Refresh-token signing secret |

| `GROQ\_API\_KEY` | Groq API credential |

| `GROQ\_MODEL` | AI model identifier |



Never publish actual credentials, JWT secrets or database connection strings.



\---



\## Development Commands



\### Frontend



Run from `client/`:



| Command | Description |

|---|---|

| `npm run dev` | Start development server |

| `npm run build` | Build production frontend |

| `npm run lint` | Run ESLint |

| `npm test` | Run frontend tests |

| `npm run preview` | Preview production build |

| `npm run test:watch` | Run tests in watch mode |



\### Backend



Run from `server/`:



| Command | Description |

|---|---|

| `npm run dev` | Start backend development server |

| `npm run build` | Compile TypeScript |

| `npm start` | Start production server |

| `npm test` | Run backend tests |

| `npm run test:watch` | Run tests in watch mode |



\---



\## Testing



Mind Vault includes automated frontend and backend tests.



The test suites cover areas such as:



\- Authentication and session management.

\- Notes and folders.

\- Synchronization.

\- Conflict resolution.

\- Knowledge packs.

\- AI validation and retrieval.

\- Embedding services.

\- Frontend API handling.

\- Account isolation.



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



\---



\## CI/CD Pipeline



Mind Vault uses GitHub Actions for continuous integration.



Workflow:



```text

&#x20;      GitHub Push / Pull Request

&#x20;                 |

&#x20;                 v

&#x20;         GitHub Actions CI

&#x20;                 |

&#x20;         +-------+-------+

&#x20;         |               |

&#x20;         v               v

&#x20;      Backend         Frontend

&#x20;      Tests            Tests

&#x20;      Build            Lint

&#x20;                       Build

&#x20;         |               |

&#x20;         +-------+-------+

&#x20;                 |

&#x20;                 v

&#x20;            Docker Builds

&#x20;                 |

&#x20;         +-------+-------+

&#x20;         |               |

&#x20;         v               v

&#x20;      Backend         Frontend

&#x20;      Image            Image

&#x20;                 |

&#x20;                 v

&#x20;         Deployment Checks

&#x20;                 |

&#x20;         +-------+-------+

&#x20;         |               |

&#x20;         v               v

&#x20;       Render           Vercel

&#x20;       Backend          Frontend

```



The GitHub Actions workflow is located at:



```text

.github/workflows/ci.yml

```



It runs backend tests, frontend linting and tests, production builds, and Docker image builds.



Production deployment checks are configured through the Vercel project settings. Render is configured to deploy after CI checks pass.



\---



\## Production Deployment



| Component | Platform |

|---|---|

| Frontend | Vercel |

| Backend | Render |

| Database | MongoDB Atlas |

| CI | GitHub Actions |

| Containerization | Docker |



\*\*Live Application:\*\*



https://mind-vault-iota-six.vercel.app/



\---



\## Security



Mind Vault implements several security measures:



\- Password hashing with bcrypt.

\- JWT authentication.

\- HttpOnly cookies.

\- Refresh-token rotation.

\- Session versioning.

\- Protected backend routes.

\- API rate limiting.

\- Request validation using Zod.

\- Secure CORS configuration.

\- Helmet security headers.

\- Account-specific local databases.



Local IndexedDB data is not encrypted by default. Users should protect access to their devices.



\---



\## Offline Architecture



Mind Vault follows an offline-first design.



The local browser database acts as the primary workspace for personal notes and downloaded knowledge.



When the network becomes available:



1\. Pending local changes are collected.

2\. Changes are pushed to the backend.

3\. Server changes are retrieved.

4\. Version conflicts are detected.

5\. Conflicts can be resolved by the user.



This approach allows users to continue working without depending on continuous internet connectivity.



\---



\## Future Improvements



Potential future enhancements include:



\- Additional knowledge packs.

\- Improved AI retrieval.

\- More advanced learning analytics.

\- Expanded multilingual capabilities.

\- Enhanced synchronization diagnostics.

\- Additional accessibility improvements.



\---



\## License



This project is currently developed as a college major project.



License terms can be added when distribution requirements are finalized.



\---



\*\*Mind Vault — Your Knowledge. Your Memory. Always Available.\*\*

