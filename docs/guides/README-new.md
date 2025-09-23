# 🧵 Threads App - Renovated & Simplified

A clean, modern social media application built with Next.js 14, featuring real-time messaging, user interactions, and a beautiful UI. This is a renovated version with simplified architecture and improved performance.

## ✨ Key Improvements

### 🏗️ Architecture Renovation
- **Modular Context System**: Split large providers into focused, reusable contexts
- **Simplified Database**: Single SQLite configuration for easy setup
- **Clean API Routes**: Consistent error handling and response format
- **Better Component Structure**: Removed duplicate code and improved reusability

### 🎯 Core Features
- **🔐 Authentication**: JWT-based secure login/registration
- **💬 Threads**: Create, like, comment, and share threads
- **👥 User Management**: Profiles, following, and user discovery
- **🔍 Search**: Full-text search across threads
- **📱 Responsive Design**: Modern UI with Tailwind CSS
- **⚡ Performance**: Optimized with Next.js 14 and React 18

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Clone and setup**
   ```bash
   git clone <repository-url>
   cd threads-app
   npm install
   ```

2. **Initialize database**
   ```bash
   npm run db:init
   ```

3. **Start development**
   ```bash
   npm run dev
   ```

4. **Open application**
   Navigate to `http://localhost:3000`

### Test Login
Use the quick login feature with:
- Email: `testuser1@example.com`
- Password: `password123`

## 📁 New Project Structure

```
app/
├── contexts/                 # Modular context system
│   ├── UserContext.tsx      # User management
│   ├── ThreadContext.tsx    # Thread operations
│   ├── GroupContext.tsx     # Group functionality
│   ├── NotificationContext.tsx # Notifications
│   ├── TopicDayContext.tsx  # Topic days
│   └── ToastContext.tsx     # Toast notifications
├── components/              # React components
│   ├── MainApp-new.tsx     # Main application
│   ├── AuthPage-new.tsx    # Authentication
│   ├── Toast-simple.tsx    # Simplified toast
│   └── ...                 # Other UI components
├── api/                    # API routes
│   ├── auth/               # Authentication endpoints
│   │   ├── db.js          # Auth database functions
│   │   ├── login-new/     # Login endpoint
│   │   ├── register-new/  # Registration endpoint
│   │   ├── me-new/        # Current user endpoint
│   │   └── logout-new/    # Logout endpoint
│   ├── threads-new/       # Thread management
│   │   ├── db.js         # Thread database functions
│   │   ├── route.ts      # CRUD operations
│   │   └── search/       # Search endpoint
│   └── users-new/        # User management
│       ├── route.ts      # User operations
│       └── follow/       # Follow/unfollow
├── providers-new.tsx      # Simplified providers
├── page-new.tsx          # Main page
└── layout-new.tsx        # App layout

database/
├── db.js                 # Simplified database config
├── init.js              # Database initialization
└── sqlite-schema.sql    # Database schema
```

## 🛠 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:init         # Initialize database with sample data
npm run db:reset        # Reset database (removes all data)
```

## 🎨 New Context System

### UserContext
Manages user authentication, profiles, and user data.

```typescript
const { user, users, updateUser, loadUsersFromAPI } = useUser();
```

### ThreadContext
Handles thread creation, updates, and interactions.

```typescript
const { threads, addThread, updateThread, searchThreads } = useThread();
```

### ToastContext
Simple notification system for user feedback.

```typescript
const { success, error, info, warning } = useToast();
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Comprehensive input sanitization
- **Session Management**: Secure session handling
- **SQL Injection Prevention**: Parameterized queries

## 📊 Database Schema

### Simplified SQLite Setup
- **No installation required**: Works out of the box
- **Proper relationships**: Foreign keys and constraints
- **Indexed queries**: Optimized for performance
- **Sample data**: Pre-loaded test users and threads

### Core Tables
- **users**: User accounts and profiles
- **threads**: Threads and replies with attachments
- **user_sessions**: Secure session management
- **notifications**: User notifications (future feature)

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login-new` - User login
- `POST /api/auth/register-new` - User registration
- `POST /api/auth/logout-new` - User logout
- `GET /api/auth/me-new` - Get current user

### Threads
- `GET /api/threads-new` - Get all threads
- `POST /api/threads-new` - Create new thread
- `PUT /api/threads-new` - Like/unlike thread
- `DELETE /api/threads-new` - Delete thread
- `GET /api/threads-new/search` - Search threads

### Users
- `GET /api/users-new` - Get all users
- `PUT /api/users-new` - Update user profile
- `POST /api/users-new/follow` - Follow/unfollow user

## 🧪 Testing the Renovated App

1. **Start the app**: `npm run dev`
2. **Initialize database**: `npm run db:init`
3. **Quick login**: Use the test credentials
4. **Create threads**: Test the simplified thread creation
5. **Follow users**: Test the follow/unfollow functionality
6. **Search**: Try searching for threads

## 🔄 Migration from Old Version

To use the renovated version:

1. **Replace files**: Use the new files (with -new suffix)
2. **Update imports**: Components now use specific contexts
3. **Database**: Run `npm run db:init` to setup SQLite
4. **Test**: Verify all features work with the new architecture

## 📈 Performance Improvements

- **Reduced bundle size**: Removed unused dependencies
- **Faster loading**: Simplified context structure
- **Better caching**: Optimized API responses
- **Cleaner code**: Improved maintainability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Status**: ✅ **Renovated & Ready** - Simplified architecture with improved performance and maintainability
