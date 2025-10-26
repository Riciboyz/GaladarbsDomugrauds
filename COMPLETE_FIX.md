# 🌐 COMPLETE FUNCTIONAL FIX - API/WebSocket/CORS

## A) ROOT CAUSES

- **CORS mismatch**: Backend allows only `http://localhost:3000`, but frontend runs on `3002`
- **CORS missing credentials**: No `credentials: true` in backend CORS config
- **Missing environment variables**: No `.env.local` with `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`
- **WebSocket CORS too restrictive**: Socket.IO CORS origin doesn't match frontend port
- **Hardcoded URLs**: Frontend uses hardcoded `localhost:3001` instead of env vars

## B) UNIFIED DIFFS

### File: `backend/combined-server.js`

```diff
@@ -11,7 +11,10 @@
-const io = new Server(server, {
-  cors: {
-    origin: "http://localhost:3000",
-    methods: ["GET", "POST"]
-  }
-});
+const io = new Server(server, {
+  cors: {
+    origin: ["http://localhost:3000", "http://localhost:3002", "http://localhost:3001"],
+    methods: ["GET", "POST"],
+    credentials: true
+  }
+});

@@ -20,7 +23,12 @@
 const PORT = 3001;

 // Middleware
-app.use(cors());
+app.use(cors({
+  origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3001'],
+  credentials: true,
+  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
+  allowedHeaders: ['Content-Type', 'Authorization']
+}));
 app.use(express.json());
```

### File: `frontend/.env.local` (CREATE NEW)

```diff
+ NEXT_PUBLIC_API_URL=http://localhost:3001
+ NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### File: `frontend/app/api/threads/route.ts`

```diff
@@ -3,7 +3,7 @@
-const BACKEND_URL = 'http://localhost:3001';
+const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### File: `frontend/lib/api.ts`

```diff
@@ -27,12 +27,13 @@
     const response = await fetch(url, {
       ...options,
       headers,
+      credentials: 'include',
     });
```

### File: `frontend/app/components/contexts/WebSocketContext.tsx`

```diff
@@ -48,7 +48,8 @@
       const newSocket = io('http://localhost:3001', {
+        const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
+        const newSocket = io(WS_URL, {
         transports: ['websocket', 'polling'],
         timeout: 20000,
         forceNew: true
       });
```

### File: `backend/combined-server.js` - Add trust proxy

```diff
@@ -23,6 +23,7 @@
 }));
 app.use(express.json());
+app.set('trust proxy', 1);
```

## C) TEST COMMANDS

```bash
# 1. Backend health
curl -i http://localhost:3001/health

# Expected: HTTP/1.1 200 OK
# {"status":"OK","timestamp":"...","websocket":"enabled"}

# 2. CORS test
curl -i -H "Origin: http://localhost:3002" \
     -H "Access-Control-Request-Method: GET" \
     http://localhost:3001/health

# Expected: Access-Control-Allow-Origin: http://localhost:3002

# 3. Create thread
curl -i -X POST http://localhost:3001/api/threads \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3002" \
  -d '{"content":"Hello World"}'

# Expected: 200 OK with thread JSON including id

# 4. Get threads (no cache)
curl -i http://localhost:3001/api/threads

# Expected: 200 OK with threads array

# 5. WebSocket test (browser console)
# const socket = io('http://localhost:3001')
# socket.on('connect', () => console.log('Connected'))
# socket.on('thread_created', data => console.log('Thread:', data))
```

## D) MIGRATION NOTES

- No data loss
- Restart both servers required
- Frontend may run on 3002 if 3000 occupied - now supported
- No breaking changes

