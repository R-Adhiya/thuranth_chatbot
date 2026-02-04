# Post-Dispatch Consolidation Platform (PDCP)

A B2B SaaS platform for last-mile logistics optimization in India, featuring blockchain-backed trust and post-dispatch consolidation.

## Project Structure

```
pdcp-platform/
├── backend/           # NestJS API server
├── frontend/          # React dispatcher web app
├── mobile/           # React Native driver app
├── blockchain/       # Hyperledger Fabric network
├── docs/            # Documentation
└── scripts/         # Deployment and utility scripts
```

## Quick Start

1. **Install dependencies:**
   ```bash
   npm run install:all
   ```

2. **Set up environment variables:**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start development servers:**
   ```bash
   npm run dev
   ```

## Architecture Overview

- **Backend:** NestJS with PostgreSQL, Redis, and WebSocket support
- **Frontend:** React with TypeScript for dispatcher dashboard
- **Mobile:** React Native for driver application
- **Blockchain:** Hyperledger Fabric for parcel custody tracking
- **Maps:** Google Maps Platform integration
- **Auth:** Firebase Authentication

## Key Features

- Post-dispatch decision engine
- Real-time vehicle tracking
- Blockchain custody verification
- Trust score management
- Impact analytics
- Shadow mode operation

## Environment Setup

See individual component README files for detailed setup instructions:
- [Backend Setup](./backend/README.md)
- [Frontend Setup](./frontend/README.md)
- [Mobile Setup](./mobile/README.md)
- [Blockchain Setup](./blockchain/README.md)

## Contributing

1. Follow the coding standards defined in each component
2. Ensure all tests pass before submitting PRs
3. Update documentation for new features
4. Follow the git workflow defined in CONTRIBUTING.md