# DomuGrauds - Social Platform

A social platform built with Next.js frontend and Express.js backend, featuring real-time communication, group management, and weather integration.

## Architecture

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js monolith (`combined-server.js`) with Socket.IO
- **Database**: SQLite
- **Real-time**: Socket.IO for WebSocket communication

## Project Structure

```
DomuGrauds/
├── frontend/               # Next.js frontend
│   ├── app/
│   │   ├── page.tsx        # Entry point
│   │   ├── layout.tsx      # Root layout
│   │   └── components/
│   │       ├── MainApp.tsx  # Main authenticated view
│   │       ├── features/    # Feature modules (threads, auth, groups, etc.)
│   │       ├── ui/          # Reusable UI primitives (Button, Input)
│   │       ├── layout/      # Sidebar, RightSidebar
│   │       ├── forms/       # EmojiPicker, HashtagInput
│   │       ├── feedback/    # ErrorBoundary, Toast
│   │       ├── utility/     # KeyboardShortcuts, LoadingState
│   │       ├── contexts/    # React contexts (User, Thread, Group, etc.)
│   │       ├── hooks/       # Custom hooks
│   │       ├── lib/         # Providers
│   │       └── styles/      # CSS/SCSS themes
│   ├── lib/                 # API client and utilities
│   └── package.json
├── backend/
│   ├── combined-server.js   # Express + Socket.IO server (single entry point)
│   ├── database/
│   │   ├── db.js            # SQLite connection
│   │   ├── migrate.js       # Migration runner
│   │   ├── migrations/      # SQL migration files
│   │   └── schemas/         # Database schema definitions
│   └── package.json
├── scripts/                 # Deployment scripts
├── nginx.conf               # Nginx reverse proxy config
└── .env                     # Environment variables
```

## Quick Start

### Prerequisites

- Node.js 18+
- Git

### Development

1. **Backend**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Or use the start script**
   ```bash
   ./start-project.sh
   ```

4. **Access**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Database Migrations

```bash
cd backend
npm run db:migrate       # Run migrations
npm run db:status        # Check status
npm run db:drift-check   # Check for drift
npm run db:baseline      # Create baseline
```

## Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DATABASE_PATH=../threads_app.db
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Threads
- `GET /api/threads` - List threads
- `POST /api/threads` - Create thread
- `PUT /api/threads/:id` - Like/unlike
- `DELETE /api/threads/:id` - Delete

### Users
- `GET /api/users` - List users
- `GET /api/users/:id` - Get user
- `POST /api/users/follow` - Follow user

### Groups
- `GET /api/groups` - List groups
- `POST /api/groups` - Create group
- `POST /api/groups/join` - Join group

### Notifications
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/read-all` - Mark all read

## WebSocket Events

**Client -> Server**: `authenticate`, `join_group`, `leave_group`, `new_thread`, `thread_updated`, `typing_start`, `typing_stop`

**Server -> Client**: `thread_created`, `thread_updated`, `notification_received`, `user_typing`

## Deployment

```bash
./scripts/deploy-full.sh       # Full deploy
./scripts/deploy-backend.sh    # Backend only
./scripts/deploy-frontend.sh   # Frontend only
```

## License

MIT
