# Features - Funkcionalitātes

Šeit ir visi galvenie aplikācijas līdzekļi, sadalīti pa funkcionalitātēm.

## 📁 Mapju apraksts

### 🔐 auth/
**Login un reģistrācija**
- `AuthPage.tsx` - Pieteikšanās un reģistrācijas lapa

### 👥 groups/
**Grupas un grupu chats**
- `Groups.tsx` - Visu grupu saraksts
- `GroupChat.tsx` - Grupu čats
- `SimpleGroupChat.tsx` - Vienkārša čata versija
- `GroupManagement.tsx` - Grupas pārvaldība
- `GroupMembers.tsx` - Grupu dalībnieki
- `GroupPosts.tsx` - Ieraksti grupās

### 👤 profile/
**Lietotāja profils**
- `Profile.tsx` - Profila lapa (skatīt/rediģēt profilu)

### 📝 threads/
**IERAKSTI (Posts/Threads) - GALVENĀ FUNKCIONALITĀTE**
- `ThreadCard.tsx` - ⭐ **SVARĪGĀKAIS** - ieraksta dizains un funkcijas (like, comment, etc)
- `Feed.tsx` - Ierakstu plūsma/feed
- `CreateThread.tsx` - Jauna ieraksta izveide (pilna forma)
- `SimpleCreateThread.tsx` - Vienkārša ieraksta forma
- `CreatePostModal.tsx` - Modāls logs jaunam ierakstam

### 📅 topics/
**Dienas tēmas**
- `DailyTopicBanner.tsx` - Dienas tēmas baneris
- `TopicSubmission.tsx` - Iesniegt ideju tēmai
- `TopicDays.tsx` - Tēmu dienu saraksts

### 🔍 search/
**Meklēšana**
- `Search.tsx` - Meklēšanas lapa
- `QuickSearchBar.tsx` - Ātrā meklēšana

### 🔔 notifications/
**Paziņojumi**
- `RealtimeNotificationsProvider.tsx` - Real-time paziņojumi
- `Notifications.tsx` - Paziņojumu saraksts
- `NotificationBell.tsx` - Paziņojumu zvaniņš
- `NotificationDropdown.tsx` - Paziņojumu dropdown

### 🌤️ weather/
**Laikapstākļi un tēmas**
- `WeatherWidget.tsx` - Laika widgets
- `WeatherEffects.tsx` - Laika efekti
- `GlobalWeatherTheme.tsx` - Laika tēma

### ⚙️ settings/
**Iestatījumi**
- `Settings.tsx` - Iestatījumu lapa
- `ThemeToggle.tsx` - Tumšā/gaišā režīma pārslēgšana

### 🛡️ admin/
**Administrācija**
- `AdminPanel.tsx` - Admin panelis

---

## 🎯 Kā atrast:

**Gribi mainīt ieraksta izskatu?** → `threads/ThreadCard.tsx`  
**Gribi mainīt feed?** → `threads/Feed.tsx`  
**Gribi mainīt profilu?** → `profile/Profile.tsx`  
**Gribi mainīt grupas?** → `groups/`  
**Gribi mainīt login?** → `auth/AuthPage.tsx`
