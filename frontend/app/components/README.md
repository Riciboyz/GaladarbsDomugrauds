# Components - Komponentu struktūra

Visi React komponenti ir šeit, loģiski organizēti pa mapēm.

## 📁 Galvenās mapes

### 🎯 features/
**GALVENĀ MAPE** - visa aplikācijas funkcionalitāte
- `threads/` - ⭐ **IERAKSTI** - ThreadCard, Feed, CreateThread
- `profile/` - Lietotāja profils
- `groups/` - Grupas un čats
- `auth/` - Login, reģistrācija
- `topics/` - Dienas tēmas
- `search/` - Meklēšana
- `notifications/` - Paziņojumi

📖 Skatīt: `features/README.md`

### 🎨 ui/
Pogas, input, kartes - visi atkārtoti izmantojamie UI elementi

### 📐 layout/
Sidebar, RightSidebar - lapas izkārtojums

### 📋 forms/
EmojiPicker, MarkdownEditor - formu komponenti

### 🔧 utility/
KeyboardShortcuts, LoadingState - utility funkcijas

---

## 🔍 Kā atrast thread/post funkcionalitāti:

```bash
cd features/threads/
ls
# ThreadCard.tsx ← ieraksta dizains
# Feed.tsx ← feed ar ierakstiem
# CreateThread.tsx ← jauna ieraksta forma
```
