#!/bin/bash

# Follow Notifications Debug Script
# Izmanto curl, lai pārbaudītu follow notifikāciju sistēmu

BASE_URL="http://localhost:3000"

echo "🚀 Follow Notifikāciju Debug Tests"
echo "=================================="
echo ""

# Test 1: Check if Next.js app is running
echo "🌐 Pārbaudām Next.js aplikāciju..."
if curl -s "$BASE_URL" > /dev/null; then
    echo "✅ Next.js aplikācija darbojas"
else
    echo "❌ Next.js aplikācija nedarbojas"
    exit 1
fi

# Test 2: Check if WebSocket server is running
echo "🔌 Pārbaudām WebSocket serveri..."
if curl -s "http://localhost:3001" > /dev/null; then
    echo "✅ WebSocket serveris darbojas"
else
    echo "❌ WebSocket serveris nedarbojas"
    exit 1
fi

echo ""
echo "🧪 Testējam follow notifikāciju sistēmu..."
echo ""

# Test 3: Try to register test users
echo "👤 Mēģinām reģistrēt testa lietotājus..."

# Register user 1
echo "📝 Reģistrējam User 1..."
USER1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser1","email":"test1@example.com","password":"password123"}')

if echo "$USER1_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User 1 reģistrēts"
    USER1_TOKEN=$(echo "$USER1_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 User 1 token: ${USER1_TOKEN:0:20}..."
else
    echo "⚠️ User 1 reģistrācija neizdevās (varbūt jau eksistē)"
fi

# Register user 2
echo "📝 Reģistrējam User 2..."
USER2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser2","email":"test2@example.com","password":"password123"}')

if echo "$USER2_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User 2 reģistrēts"
    USER2_TOKEN=$(echo "$USER2_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 User 2 token: ${USER2_TOKEN:0:20}..."
else
    echo "⚠️ User 2 reģistrācija neizdevās (varbūt jau eksistē)"
fi

echo ""
echo "🔐 Mēģinām ielogoties..."

# Login user 1
echo "📤 User 1 ielogojas..."
LOGIN1_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser1","password":"password123"}')

if echo "$LOGIN1_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User 1 ielogojies"
    USER1_TOKEN=$(echo "$LOGIN1_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    USER1_ID=$(echo "$LOGIN1_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 User 1 token: ${USER1_TOKEN:0:20}..."
    echo "🆔 User 1 ID: $USER1_ID"
else
    echo "❌ User 1 ielogošanās neizdevās"
    echo "📋 Atbilde: $LOGIN1_RESPONSE"
    exit 1
fi

# Login user 2
echo "📤 User 2 ielogojas..."
LOGIN2_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser2","password":"password123"}')

if echo "$LOGIN2_RESPONSE" | grep -q "success.*true"; then
    echo "✅ User 2 ielogojies"
    USER2_TOKEN=$(echo "$LOGIN2_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    USER2_ID=$(echo "$LOGIN2_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "🔑 User 2 token: ${USER2_TOKEN:0:20}..."
    echo "🆔 User 2 ID: $USER2_ID"
else
    echo "❌ User 2 ielogošanās neizdevās"
    echo "📋 Atbilde: $LOGIN2_RESPONSE"
    exit 1
fi

echo ""
echo "👥 Testējam follow darbību..."

# User 1 follows User 2
echo "📤 User 1 seko User 2..."
FOLLOW_RESPONSE=$(curl -s -X POST "$BASE_URL/api/users/follow" \
    -H "Content-Type: application/json" \
    -H "Cookie: auth-token=$USER1_TOKEN" \
    -d "{\"userId\":\"$USER2_ID\",\"action\":\"follow\"}")

if echo "$FOLLOW_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Follow darbība veiksmīga"
    echo "📊 Follow API atbilde: $FOLLOW_RESPONSE"
else
    echo "❌ Follow darbība neizdevās"
    echo "📋 Atbilde: $FOLLOW_RESPONSE"
    exit 1
fi

echo ""
echo "⏳ Gaidām 3 sekundes, lai notifikācija tiktu apstrādāta..."
sleep 3

echo ""
echo "📬 Pārbaudām User 2 notifikācijas..."

# Check User 2's notifications
NOTIFICATION_RESPONSE=$(curl -s -X GET "$BASE_URL/api/notifications" \
    -H "Content-Type: application/json" \
    -H "Cookie: auth-token=$USER2_TOKEN")

echo "📊 Notifikāciju API atbilde: $NOTIFICATION_RESPONSE"

if echo "$NOTIFICATION_RESPONSE" | grep -q "follow"; then
    echo "🎉 Follow notifikācija atrasta!"
    echo "✅ Follow notifikāciju sistēma darbojas!"
else
    echo "⚠️ Follow notifikācija nav atrasta"
    echo "❌ Follow notifikāciju sistēma nedarbojas"
fi

echo ""
echo "🔔 Testējam tiešo notifikāciju sūtīšanu..."

# Test direct notification
DIRECT_NOTIF_RESPONSE=$(curl -s -X POST "$BASE_URL/api/notifications/send" \
    -H "Content-Type: application/json" \
    -H "Cookie: auth-token=$USER1_TOKEN" \
    -d "{\"type\":\"follow\",\"fromUserId\":\"$USER1_ID\",\"toUserId\":\"$USER2_ID\",\"data\":{\"fromUsername\":\"Test User 1\"}}")

if echo "$DIRECT_NOTIF_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Tiešā notifikācija nosūtīta"
    echo "📝 Notifikācijas ID: $(echo "$DIRECT_NOTIF_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)"
else
    echo "❌ Tiešā notifikācija neizdevās"
    echo "📋 Atbilde: $DIRECT_NOTIF_RESPONSE"
fi

echo ""
echo "📊 Testa Rezultāti:"
echo "=================="
echo "✅ Next.js aplikācija darbojas"
echo "✅ WebSocket serveris darbojas"
echo "✅ Lietotāju autentifikācija darbojas"
echo "✅ Follow API darbojas"
if echo "$NOTIFICATION_RESPONSE" | grep -q "follow"; then
    echo "✅ Follow notifikācijas darbojas"
else
    echo "❌ Follow notifikācijas nedarbojas"
fi
if echo "$DIRECT_NOTIF_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Tiešās notifikācijas darbojas"
else
    echo "❌ Tiešās notifikācijas nedarbojas"
fi
