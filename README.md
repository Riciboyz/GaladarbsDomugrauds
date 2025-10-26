# DomuGrauds - Social Platform

A modern social platform built with Next.js frontend and Express.js backend, featuring real-time communication, group management, and weather integration.

## 🏗️ Architecture

The application has been split into separate frontend and backend components with a clear API contract:

- **Frontend**: Next.js application with React components
- **Backend**: Express.js API server with WebSocket support
- **Database**: SQLite database
- **Real-time**: Socket.IO for WebSocket communication

## 📁 Project Structure

```
DomuGrauds/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # Next.js app directory
│   ├── lib/                  # API client and utilities
│   ├── package.json          # Frontend dependencies
│   └── Dockerfile           # Frontend Docker configuration
├── backend/                  # Express.js backend application
│   ├── routes/              # API route handlers
│   ├── middleware/          # Express middleware
│   ├── database/            # Database configuration and queries
│   ├── package.json         # Backend dependencies
│   └── Dockerfile          # Backend Docker configuration
├── scripts/                 # Deployment scripts
├── docker-compose.yml       # Docker Compose configuration
├── nginx.conf              # Nginx reverse proxy configuration
└── README.md               # This file
```


## ⚠️ Migration System Update

**IMPORTANT**: All database migrations have been consolidated into the backend system.

### Before (Legacy)
- Multiple migration systems
- PostgreSQL and SQLite migrations
- Scattered migration files

### After (Consolidated)
- Single migration system in backend
- SQLite-only migrations
- Centralized migration management

### Migration Commands
```bash
cd backend
npm run db:migrate      # Run migrations
npm run db:status       # Check status  
npm run db:drift-check  # Check for drift
npm run db:baseline     # Create baseline
```

See `backend/database/MIGRATION_GUIDE.md` for complete documentation.


## ⚠️ Migration System Update

**IMPORTANT**: All database migrations have been consolidated into the backend system.

### Before (Legacy)
- Multiple migration systems
- PostgreSQL and SQLite migrations
- Scattered migration files

### After (Consolidated)
- Single migration system in backend
- SQLite-only migrations
- Centralized migration management

### Migration Commands
```bash
cd backend
npm run db:migrate      # Run migrations
npm run db:status       # Check status  
npm run db:drift-check  # Check for drift
npm run db:baseline     # Create baseline
```

See `backend/database/MIGRATION_GUIDE.md` for complete documentation.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (for containerized deployment)
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DomuGrauds
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run db:init
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

### Production Deployment

#### Using Docker Compose (Recommended)

1. **Set environment variables**
   ```bash
   export JWT_SECRET="your-super-secret-jwt-key"
   export NEXT_PUBLIC_API_URL="http://your-domain.com"
   export NEXT_PUBLIC_WS_URL="ws://your-domain.com"
   ```

2. **Deploy all services**
   ```bash
   ./scripts/deploy-full.sh
   ```

#### Individual Service Deployment

- **Backend only**: `./scripts/deploy-backend.sh`
- **Frontend only**: `./scripts/deploy-frontend.sh`

## 📚 API Documentation

The backend provides comprehensive API documentation using Swagger/OpenAPI:

- **Development**: http://localhost:3001/api-docs
- **Production**: http://your-domain.com/api-docs

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Threads
- `GET /api/threads` - Get all threads
- `POST /api/threads` - Create new thread
- `PUT /api/threads/:id` - Like/unlike thread
- `DELETE /api/threads/:id` - Delete thread

#### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users/follow` - Follow a user

#### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create a group
- `POST /api/groups/join` - Join a group

#### Notifications
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/read-all` - Mark all as read

## 🔌 WebSocket Events

### Client to Server
- `authenticate` - Authenticate user
- `join_group` - Join a group room
- `leave_group` - Leave a group room
- `new_thread` - Create new thread
- `thread_updated` - Update thread
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

### Server to Client
- `thread_created` - New thread created
- `thread_updated` - Thread updated
- `notification_received` - New notification
- `user_typing` - User typing indicator

## 🛠️ Development

### Backend Development

```bash
cd backend
npm run dev          # Start development server
npm run db:init      # Initialize database
npm run db:reset     # Reset database
npm test            # Run tests
```

### Frontend Development

```bash
cd frontend
npm run dev         # Start development server
npm run build       # Build for production
npm run start       # Start production server
npm run lint        # Run linter
```

### Environment Variables

#### Backend (.env)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-jwt-secret
DATABASE_PATH=../threads_app.db
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
EMAIL_FROM=noreply@domugrauds.com
RESEND_API_KEY=your-resend-api-key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## 🐳 Docker Configuration

### Services

- **backend**: Express.js API server
- **frontend**: Next.js application
- **nginx**: Reverse proxy and load balancer

### Volumes

- `./threads_app.db:/app/data/threads_app.db` - Database persistence
- `./uploads:/app/uploads` - File uploads

### Ports

- `3000` - Frontend
- `3001` - Backend API
- `80` - Nginx (HTTP)
- `443` - Nginx (HTTPS)

## 🔧 Configuration

### Database

The application uses SQLite for simplicity. For production, consider migrating to PostgreSQL or MySQL:

1. Update database configuration in `backend/database/`
2. Modify connection strings
3. Run database migrations

### Authentication

- JWT tokens for API authentication
- HTTP-only cookies for web authentication
- Optional 2FA via email

### File Uploads

- Local file storage in `uploads/` directory
- Support for images and documents
- Configurable file size limits

## 📊 Monitoring

### Health Checks

- Backend: `GET /health`
- Docker health checks configured
- Service status monitoring

### Logging

- Structured logging with Morgan
- Error tracking and reporting
- WebSocket connection monitoring

## 🚀 Deployment Options

### 1. Docker Compose (Recommended)
- Single command deployment
- Automatic service orchestration
- Built-in reverse proxy

### 2. Kubernetes
- Container orchestration
- Auto-scaling capabilities
- Production-ready deployment

### 3. Cloud Platforms
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the deployment logs

## 🔄 Migration from Monolith

This project was migrated from a monolithic Next.js application to a microservices architecture:

### Changes Made:
1. **Separated concerns**: Frontend and backend are now independent
2. **API contract**: Clear REST API with OpenAPI documentation
3. **Real-time communication**: WebSocket server integrated with backend
4. **Independent deployment**: Each service can be deployed separately
5. **Containerization**: Docker support for easy deployment
6. **Reverse proxy**: Nginx configuration for production

### Benefits:
- **Scalability**: Services can be scaled independently
- **Maintainability**: Clear separation of concerns
- **Development**: Teams can work on frontend/backend independently
- **Deployment**: Flexible deployment strategies
- **Testing**: Easier to test individual components