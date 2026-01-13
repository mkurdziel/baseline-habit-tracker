# Habit Tracker

A full-stack habit tracking application with multi-user support, flexible scheduling, streak tracking, and analytics.

## Tech Stack

- **Backend**: Node.js + Fastify + TypeScript
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT (access + refresh tokens)
- **Deployment**: Docker + docker-compose

## Features

- Multi-user authentication (email/password)
- Create habits with flexible scheduling (daily, weekly, custom days)
- Track habit completions
- Streak tracking and analytics
- Calendar heatmap visualization
- Charts for completion patterns

## Quick Start

### Prerequisites

- bun 1.0+
- Docker & Docker Compose (for database/deployment)

### Development Setup

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Start PostgreSQL**
   ```bash
   docker compose -f docker-compose.dev.yml up -d
   ```

3. **Set up environment**
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```

4. **Run database migrations**
   ```bash
   bun db:migrate
   ```

5. **Start development servers**
   ```bash
   bun dev
   ```

   The servers will display their URLs when ready:
   - **Web App**: http://localhost:5173 (this is what you want to open in your browser)
   - **API**: http://localhost:3001

### Docker Deployment

1. **Build and run all services**
   ```bash
   docker compose up -d
   ```

2. **Access the application**
   - **Web**: http://localhost:3000 (note: different port than dev mode)
   - **API**: http://localhost:3001

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |
| `JWT_SECRET` | Secret for signing access tokens | - |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | - |
| `PORT` | API server port | 3001 |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:5173 |

## Project Structure

```
/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── middleware/  # Auth middleware
│   │   │   └── lib/         # Shared utilities
│   │   └── prisma/          # Database schema
│   └── web/                 # React frontend
│       └── src/
│           ├── components/  # Reusable components
│           ├── pages/       # Page components
│           ├── context/     # React context
│           └── api/         # API client
├── packages/
│   └── shared/              # Shared TypeScript types
├── docker-compose.yml       # Full stack deployment
├── docker-compose.dev.yml   # PostgreSQL only for dev
└── Dockerfile
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Habits
- `GET /api/habits` - List habits
- `POST /api/habits` - Create habit
- `GET /api/habits/:id` - Get habit
- `PATCH /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Archive habit

### Completions
- `GET /api/habits/:id/completions` - Get completions
- `POST /api/habits/:id/complete` - Mark complete
- `DELETE /api/habits/:id/complete/:date` - Remove completion
- `POST /api/habits/:id/toggle` - Toggle completion

### Analytics
- `GET /api/analytics/overview` - Overall stats
- `GET /api/analytics/calendar` - Calendar heatmap data
- `GET /api/analytics/habit/:id` - Per-habit analytics

## License

MIT
