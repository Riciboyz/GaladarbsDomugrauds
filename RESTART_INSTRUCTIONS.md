# 🔄 RESTART INSTRUCTIONS

## ✅ All fixes applied:
- CORS allows ports 3000, 3002, 3001
- WebSocket CORS with credentials
- Environment variables for API/WS URLs
- credentials: 'include' in all API calls
- trust proxy enabled

## 🚀 START SERVERS:

### Terminal 1 - Backend:
```bash
cd /Users/riciboy/GaladarbsDomugrauds/backend
npm run dev
```

**Look for:**
```
🚀 Combined API + WebSocket Server running on port 3001
✅ Connected to SQLite database
```

### Terminal 2 - Frontend:
```bash
cd /Users/riciboy/GaladarbsDomugrauds/frontend
npm run dev
```

**Look for:**
```
- Local:        http://localhost:3000
```

## ✅ Open Browser:

http://localhost:3000

## 🧪 Quick Tests:

```bash
# Backend health
curl http://localhost:3001/health

# Create thread
curl -X POST http://localhost:3001/api/threads \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello World"}'

# Should return: {"success":true,"thread":{...}}
```

## 📝 What was fixed:

1. **CORS** - Backend now accepts requests from all common ports
2. **WebSocket CORS** - Socket.IO with proper origin list
3. **Environment Variables** - All hardcoded URLs replaced with env vars
4. **Credentials** - API calls include cookies/auth
5. **Trust Proxy** - For reverse proxy support

## 🎯 Expected Behavior:

- ✅ Frontend loads without CORS errors
- ✅ API calls work (GET/POST threads)
- ✅ WebSocket connects automatically
- ✅ New threads appear and stay visible
- ✅ Real-time updates work

