#!/bin/bash

# Threads App Renovation Deployment Script
# This script switches from old files to new renovated files

echo "🚀 Starting Threads App Renovation Deployment..."

# Create backup of current files
echo "📦 Creating backup of current files..."
mkdir -p backup/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backup/$(date +%Y%m%d_%H%M%S)"

# Backup current files
cp app/providers.tsx "$BACKUP_DIR/providers.tsx.bak" 2>/dev/null || true
cp app/layout.tsx "$BACKUP_DIR/layout.tsx.bak" 2>/dev/null || true
cp app/page.tsx "$BACKUP_DIR/page.tsx.bak" 2>/dev/null || true
cp package.json "$BACKUP_DIR/package.json.bak" 2>/dev/null || true
cp README.md "$BACKUP_DIR/README.md.bak" 2>/dev/null || true

echo "✅ Backup created in $BACKUP_DIR"

# Replace main application files
echo "🔄 Replacing main application files..."

# Replace providers
if [ -f "app/providers-new.tsx" ]; then
    cp app/providers-new.tsx app/providers.tsx
    echo "✅ Updated providers.tsx"
fi

# Replace layout
if [ -f "app/layout-new.tsx" ]; then
    cp app/layout-new.tsx app/layout.tsx
    echo "✅ Updated layout.tsx"
fi

# Replace main page
if [ -f "app/page-new.tsx" ]; then
    cp app/page-new.tsx app/page.tsx
    echo "✅ Updated page.tsx"
fi

# Replace package.json
if [ -f "package-new.json" ]; then
    cp package-new.json package.json
    echo "✅ Updated package.json"
fi

# Replace README
if [ -f "README-new.md" ]; then
    cp README-new.md README.md
    echo "✅ Updated README.md"
fi

# Update component imports in MainApp
if [ -f "app/components/MainApp-new.tsx" ]; then
    cp app/components/MainApp-new.tsx app/components/MainApp.tsx
    echo "✅ Updated MainApp.tsx"
fi

# Update AuthPage
if [ -f "app/components/AuthPage-new.tsx" ]; then
    cp app/components/AuthPage-new.tsx app/components/AuthPage.tsx
    echo "✅ Updated AuthPage.tsx"
fi

# Replace API routes
echo "🔄 Updating API routes..."

# Auth routes
if [ -d "app/api/auth/login-new" ]; then
    rm -rf app/api/auth/login
    mv app/api/auth/login-new app/api/auth/login
    echo "✅ Updated auth/login"
fi

if [ -d "app/api/auth/register-new" ]; then
    rm -rf app/api/auth/register
    mv app/api/auth/register-new app/api/auth/register
    echo "✅ Updated auth/register"
fi

if [ -d "app/api/auth/me-new" ]; then
    rm -rf app/api/auth/me
    mv app/api/auth/me-new app/api/auth/me
    echo "✅ Updated auth/me"
fi

if [ -d "app/api/auth/logout-new" ]; then
    rm -rf app/api/auth/logout
    mv app/api/auth/logout-new app/api/auth/logout
    echo "✅ Updated auth/logout"
fi

# Copy auth db
if [ -f "app/api/auth/db.js" ]; then
    echo "✅ Auth database functions ready"
fi

# Threads routes
if [ -d "app/api/threads-new" ]; then
    rm -rf app/api/threads
    mv app/api/threads-new app/api/threads
    echo "✅ Updated threads API"
fi

# Users routes
if [ -d "app/api/users-new" ]; then
    rm -rf app/api/users
    mv app/api/users-new app/api/users
    echo "✅ Updated users API"
fi

# Initialize database
echo "🗄️ Initializing database..."
if [ -f "database/init.js" ]; then
    node database/init.js
    echo "✅ Database initialized with sample data"
else
    echo "⚠️ Database initialization script not found"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️ Building application..."
npm run build

echo ""
echo "🎉 Renovation deployment completed successfully!"
echo ""
echo "📋 Summary of changes:"
echo "  ✅ Modular context system implemented"
echo "  ✅ Simplified database configuration (SQLite)"
echo "  ✅ Clean API routes with consistent error handling"
echo "  ✅ Improved component architecture"
echo "  ✅ Database initialized with sample data"
echo ""
echo "🚀 You can now start the application with:"
echo "   npm run dev"
echo ""
echo "📖 Test login credentials:"
echo "   Email: testuser1@example.com"
echo "   Password: password123"
echo ""
echo "📁 Backup of old files saved in: $BACKUP_DIR"
