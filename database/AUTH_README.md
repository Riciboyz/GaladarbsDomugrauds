# 🔐 Authentication System

Pilnīga autentifikācijas sistēma ar drošu paroļu hashing un datubāzes integrāciju.

## ✅ **Kas ir izveidots:**

### **1. 🗄️ Datubāzes shēma**
- `users` tabula ar unikāliem e-pastiem
- Drošs paroļu hashing ar bcrypt
- Session pārvaldība
- Automātiskas timestamp atjaunināšanas

### **2. 🔌 API Endpoints**
- `POST /api/auth/register` - Lietotāja reģistrācija
- `POST /api/auth/login` - Lietotāja pieteikšanās
- `POST /api/auth/logout` - Lietotāja iziešana

### **3. 🛡️ Drošības funkcijas**
- Paroļu hashing ar bcrypt (12 salt rounds)
- E-pasta validācija
- Paroļu garuma pārbaude (min 6 rakstzīmes)
- Unikālu e-pastu un lietotājvārdu pārbaude
- Session token pārvaldība

### **4. 📝 Formu validācija**
- Reāllaika validācija
- Kļūdu ziņojumi
- Loading stāvokļi
- Disabled pogas validācijas laikā

## 🚀 **Kā izmantot:**

### **1. Iestatīt autentifikāciju:**
```bash
# Instalēt atkarības
npm install

# Palaist autentifikācijas demo
npm run demo:auth
```

### **2. Reģistrēties:**
1. Atveriet lietotni
2. Noklikšķiniet "Sign up"
3. Ievadiet:
   - E-pastu (jābūt unikālam)
   - Lietotājvārdu (jābūt unikālam)
   - Paroli (min 6 rakstzīmes)
   - Vārdu un uzvārdu
4. Noklikšķiniet "Sign Up"

### **3. Pieteikties:**
1. Ievadiet e-pastu un paroli
2. Noklikšķiniet "Login"
3. Sistēma pārbaudīs paroli un ielogos jūs

### **4. Iziet:**
1. Noklikšķiniet uz logout pogu sidebarā
2. Sessija tiks izdzēsta

## 🔒 **Drošības īpašības:**

### **Paroļu drošība:**
- ✅ Paroles tiek hashētas ar bcrypt
- ✅ 12 salt rounds drošībai
- ✅ Paroles nekad netiek glabātas plain text
- ✅ Paroļu salīdzināšana ar timing attack aizsardzību

### **Validācija:**
- ✅ E-pasta formāta pārbaude
- ✅ Paroļu garuma pārbaude
- ✅ Unikālu e-pastu pārbaude
- ✅ Unikālu lietotājvārdu pārbaude

### **Session pārvaldība:**
- ✅ Secure HTTP-only cookies
- ✅ Session token ģenerēšana
- ✅ Automātiska session izbeigšana
- ✅ Cross-site request forgery aizsardzība

## 📊 **Datubāzes struktūra:**

```sql
-- Lietotāji
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    bio TEXT,
    followers TEXT DEFAULT '[]',
    following TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sessions
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🧪 **Testēšana:**

### **Demo skripts:**
```bash
npm run demo:auth
```

### **Manuāla testēšana:**
1. Reģistrējieties ar jaunu e-pastu
2. Mēģiniet reģistrēties ar to pašu e-pastu (jāsaņem kļūda)
3. Pieteikties ar pareizu paroli
4. Mēģiniet pieteikties ar nepareizu paroli (jāsaņem kļūda)
5. Iziet un pieteikties vēlreiz

## 🎯 **Rezultāts:**

- ✅ **E-pasts var reģistrēt tikai 1 reizi**
- ✅ **Parole jāievada pareizi**
- ✅ **Konts tiek saglabāts datubāzē**
- ✅ **Droša autentifikācija**
- ✅ **Profesionāla validācija**

Tagad jūsu lietotnei ir pilnīga, droša autentifikācijas sistēma! 🎉
