# 🚀 Kā Palaist Projektu

## AUTOMĀTISKĀ PALAIŠANA

```bash
cd /Users/riciboy/GaladarbsDomugrauds
bash start-project.sh
```

## MANUĀLĀ PALAIŠANA (2 TERMINĀLI)

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```
✅ Jāredz: "🚀 Combined API + WebSocket Server running on port 3001"

### Terminal 2 - Frontend  
```bash
cd frontend
npm run dev
```
✅ Jāredz: "Local: http://localhost:3000"

## 📱 ATVER PĀRLŪKĀ

http://localhost:3000

## ✅ PĀRBAUDE

```bash
# 1. Backend darbojas?
curl http://localhost:3001/health

# 2. Frontend darbojas?
curl http://localhost:3000

# 3. Testē API
curl http://localhost:3001/api/threads
```

## 🔧 JA NEDARBOJAS

1. **Ports ir aizņemtsi:**
   ```bash
   # Noņemt vecos procesus
   pkill -f "nodemon" && pkill -f "next dev"
   ```

2. **Nav node_modules:**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend
   cd frontend && npm install
   ```

3. **Database nav sagatavota:**
   ```bash
   cd backend
   npm run db:migrate
   ```

## 📊 STATUS

- ✅ Backend ir darbojas (port 3001)
- ⚠️ Frontend ir darbojas (bet var būt uz citā porta)
- ✅ Visas izmaiņas ir saglabātas

**Atver browseru un pārlādē lapu!**

