# 🚀 QUICK START - All Fixes Applied

## ✅ Fixed Issues:

1. **CORS** - Backend now allows all ports (3000, 3002, 3001)
2. **WebSocket CORS** - Credentials enabled, multiple origins
3. **Environment variables** - API/WS URLs now use env vars
4. **Credentials** - All API calls include credentials

## 🎯 Start Project:

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend:
```bash
cd frontend  
npm run dev
```

## 📱 Access:

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:3000 (or 3002 if 3000 is occupied)

## ✅ Test Commands:

```bash
# 1. Health check
curl http://localhost:3001/health

# 2. Create thread
curl -X POST http://localhost:3001/api/threads \
  -H "Content-Type: application/json" \
  -d '{"content":"Test"}'

# 3. Get threads
curl http://localhost:3001/api/threads
```

## 🔄 RESTART REQUIRED:

Backend restart required for CORS changes:

```bash
# Stop old backend
pkill -f "nodemon"

# Start new backend
cd backend && npm run dev
```

Frontend will auto-reload on code changes.

