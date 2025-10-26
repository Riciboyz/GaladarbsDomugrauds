# Thread Disappearing Bug - Complete Fix Summary

## A) ROOT CAUSES

- **Race condition**: `SimpleCreateThread.tsx` called `loadThreadsFromAPI()` after 1 second, which REPLACED all threads
- **No WebSocket event handling**: Frontend wasn't listening for `thread_created` Socket.IO events
- **Incomplete thread data**: Backend emitted thread without user info (username, display_name, avatar)
- **Next.js caching**: API routes had no cache control, causing stale data to overwrite new threads
- **Missing deduplication**: ThreadContext didn't properly handle Socket.IO event format

## B) FIXES - UNIFIED DIFFS

### File: `frontend/app/components/legacy/SimpleCreateThread.tsx`

```diff
--- a/frontend/app/components/legacy/SimpleCreateThread.tsx
+++ b/frontend/app/components/legacy/SimpleCreateThread.tsx
@@ -113,11 +113,8 @@
         
         success('Success', 'Thread posted successfully!')
         
-        // Force refresh threads as fallback
-        setTimeout(() => {
-          console.log('Force refreshing threads...')
-          loadThreadsFromAPI()
-        }, 1000)
+        // Don't reload threads - WebSocket event will handle it
+        // This prevents race conditions and data loss
```

### File: `frontend/app/api/threads/route.ts`

```diff
@@ -11,6 +11,7 @@
     const response = await fetch(`${BACKEND_URL}/api/threads?${queryString}`, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json',
       },
+      cache: 'no-store', // Prevent caching to avoid stale data
     });
@@ -23,6 +24,13 @@
     const data = await response.json();
-    return NextResponse.json(data);
+    return NextResponse.json(data, {
+      headers: {
+        'Cache-Control': 'no-store, no-cache, must-revalidate',
+      },
     });
   }
 }
+
+// Disable caching for this route
+export const dynamic = 'force-dynamic';
+export const revalidate = 0;
```

### File: `frontend/app/components/contexts/ThreadContext.tsx`

```diff
@@ -99,7 +99,10 @@
   const loadThreadsFromAPI = async () => {
     try {
       console.log('🔄 Loading threads from API...')
-      const response = await fetch('/api/threads')
+      const response = await fetch('/api/threads', {
+        cache: 'no-store', // Always fetch fresh data
+        next: { revalidate: 0 }
+      })
       
@@ -67,9 +66,11 @@
     const handleWebSocketMessage = (event: CustomEvent) => {
       try {
-        const message = JSON.parse(event.detail)
+        // event.detail might already be an object or a string
+        const message = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail
         console.log('📝 ThreadContext: Received WebSocket message:', message.type)
```

### File: `frontend/app/components/contexts/WebSocketContext.tsx`

```diff
@@ -93,7 +93,20 @@
         setIsConnected(false)
       })
       
+      // Listen for thread events
+      newSocket.on('thread_created', (data) => {
+        console.log('📝 WebSocketProvider: Thread created via Socket.IO:', data)
+        const message = { type: 'thread_created', data }
+        setLastMessage(message)
+        window.dispatchEvent(new CustomEvent('websocket-message', { 
+          detail: message
+        }))
+      })
+      
+      newSocket.on('thread_updated', (data) => {
+        console.log('📝 WebSocketProvider: Thread updated via Socket.IO:', data)
+        const message = { type: 'thread_updated', data }
+        setLastMessage(message)
+        window.dispatchEvent(new CustomEvent('websocket-message', { 
+          detail: message
+        }))
+      })
+      
       // Handle different message types
       newSocket.on('message', (data) => {
```

### File: `backend/combined-server.js`

```diff
@@ -227,16 +227,35 @@
   db.run(
     `INSERT INTO threads (id, author_id, content, parent_id, group_id, topic_day_id, visibility, attachments, likes, dislikes, created_at, updated_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', datetime('now'), datetime('now'))`,
     [threadId, userId, content, parent_id, group_id, topic_day_id, visibility, attachmentsJson],
-    function(err) {
-      if (err) {
-        return res.status(500).json({ error: 'Database error' });
-      }
-      
-      const newThread = { /* ... */ };
-      
-      // Broadcast to all connected clients via WebSocket
-      io.emit('thread_created', { type: 'thread_created', data: newThread });
-      
-      res.json({ success: true, thread: newThread });
-    }
+    function(err) {
+      if (err) {
+        return res.status(500).json({ error: 'Database error' });
+      }
+      
+      // Fetch the full thread with user info to match GET response format
+      db.get(
+        `SELECT t.*, u.username, u.display_name, u.avatar as avatar_url 
+         FROM threads t 
+         JOIN users u ON t.author_id = u.id 
+         WHERE t.id = ?`,
+        [threadId],
+        (err, row) => {
+          if (err) {
+            return res.status(500).json({ error: 'Database error' });
+          }
+          
+          // Broadcast to all connected clients via WebSocket
+          io.emit('thread_created', row);
+          
+          res.json({ success: true, thread: row });
+        }
+      );
+    }
   );
 });
```

### File: `frontend/next.config.js`

```diff
@@ -1,6 +1,9 @@
 /** @type {import('next').NextConfig} */
 const nextConfig = {
   images: {
     domains: ['localhost', 'via.placeholder.com'],
   },
+  // Disable caching for API routes to prevent stale data
+  experimental: {
+    fetchCache: false,
   },
 }
```

## C) TEST COMMANDS

```bash
# 1. Backend health
curl http://localhost:3001/health

# 2. Create a thread
curl -X POST http://localhost:3001/api/threads \
  -H "Content-Type: application/json" \
  -d '{"content":"Test thread"}'

# Expected: {"success":true,"thread":{"id":"...","content":"Test thread",...}}

# 3. Verify thread appears in list
curl http://localhost:3001/api/threads

# Expected: Contains the newly created thread

# 4. Test WebSocket connection
# In browser console:
# const socket = io('http://localhost:3001')
# socket.on('thread_created', data => console.log('Thread created:', data))
# socket.on('connect', () => console.log('Connected'))

# 5. Test via frontend (browser)
# - Create a thread via UI
# - Verify it appears immediately
# - Verify it doesn't disappear after 1-2 seconds
```

## D) EXPECTED BEHAVIOR

**Before:**
- Thread appears → disappears after 1 second
- WebSocket events not received
- Stale cache overwrites new threads

**After:**
- Thread appears → stays visible
- WebSocket event updates UI immediately
- No cache issues
- Full thread data (with username, avatar)

## E) MIGRATION NOTES

- No data migration needed
- Backend restart required for WebSocket changes
- Frontend cache cleared automatically on save
- No breaking changes

