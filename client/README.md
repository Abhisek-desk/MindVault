Mind Vault Frontend
The React frontend for Mind Vault, an offline-first personal knowledge platform.
Technology
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand
- TanStack Query
- React Router
- Dexie and IndexedDB
- MiniSearch
- i18next
- Vitest
Requirements
- Node.js 24 or later
- npm
Installation
Run npm ci.
Development
Run npm run dev.
Production Build
Run npm run build.

Production output is generated in the dist/ directory.
Linting
Run npm run lint.
Testing
Run npm test.
Preview
Run npm run preview.
Main Features
- User authentication
- Notes and folder management
- Offline-first local storage
- Account-specific IndexedDB databases
- Downloadable knowledge packs
- Offline full-text search
- Synchronization and conflict resolution
- AI assistant integration
- Progressive Web App support
- Responsive interface
API Integration
The frontend communicates with the backend through /api/v1.

In production, Vercel rewrites API and knowledge-pack download requests to the Render backend.
Docker
Build the frontend image using docker compose build mindvault-client.

Start the application using docker compose up -d.

Local Docker frontend: http://localhost:8080.
Deployment
Frontend hosting: Vercel.
CI/CD: GitHub Actions validates changes before production deployment.
