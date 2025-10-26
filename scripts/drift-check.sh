#!/bin/bash

# DomuGrauds Schema Drift Check Script
# Pārbauda, vai produkcijas shēma atbilst migrāciju failiem

set -e

echo "🔍 Starting Schema Drift Check..."

# Konfigurācija
BACKEND_DIR="./backend"
PROD_DB_PATH="${PROD_DATABASE_PATH:-../threads_app.db}"
BACKUP_DB_PATH="./backup_prod.db"

# Funkcijas
check_dependencies() {
    if [ ! -d "$BACKEND_DIR" ]; then
        echo "❌ Backend directory not found: $BACKEND_DIR"
        exit 1
    fi
    
    if [ ! -f "$PROD_DB_PATH" ]; then
        echo "❌ Production database not found: $PROD_DB_PATH"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        exit 1
    fi
}

backup_production_db() {
    echo "📦 Creating backup of production database..."
    cp "$PROD_DB_PATH" "$BACKUP_DB_PATH"
    echo "✅ Backup created: $BACKUP_DB_PATH"
}

run_drift_check() {
    echo "🔍 Running drift check..."
    
    cd "$BACKEND_DIR"
    
    # Pārbaudām migrāciju statusu
    echo "📊 Checking migration status..."
    npm run db:status
    
    # Pārbaudām drift
    echo "🔍 Checking for schema drift..."
    if npm run db:drift-check; then
        echo "✅ No drift detected - schema is clean"
        return 0
    else
        echo "❌ Drift detected - schema is not clean"
        return 1
    fi
}

cleanup() {
    echo "🧹 Cleaning up..."
    if [ -f "$BACKUP_DB_PATH" ]; then
        rm -f "$BACKUP_DB_PATH"
        echo "✅ Backup cleaned up"
    fi
}

# Galvenā loģika
main() {
    echo "🚀 DomuGrauds Schema Drift Check"
    echo "=================================="
    
    # Pārbaudām atkarības
    check_dependencies
    
    # Izveidojam backup
    backup_production_db
    
    # Pārbaudām drift
    if run_drift_check; then
        echo ""
        echo "🎉 Schema drift check PASSED"
        echo "✅ Production schema is clean and up to date"
        cleanup
        exit 0
    else
        echo ""
        echo "❌ Schema drift check FAILED"
        echo "⚠️  Production schema has drift issues"
        echo ""
        echo "🔧 Recommended actions:"
        echo "   1. Review migration files in backend/database/migrations/"
        echo "   2. Run 'npm run db:migrate' to apply pending migrations"
        echo "   3. Run 'npm run db:baseline' to create new baseline if needed"
        echo ""
        echo "📁 Backup available at: $BACKUP_DB_PATH"
        exit 1
    fi
}

# Cleanup on exit
trap cleanup EXIT

# Palaišam galveno funkciju
main "$@"
